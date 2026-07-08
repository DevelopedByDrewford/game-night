import { HttpsError } from 'firebase-functions/v2/https';
import { buildDeck, bracketForPlayerCount, TOKENS_TO_WIN } from './deck.js';
import { shuffle } from './shuffle.js';
import { dealSetup, isLegalPlay, applyCardEffect, pickRoundWinners, nextActiveUid } from './rules.js';

function emptyMap(uids, value) {
  return Object.fromEntries(uids.map((uid) => [uid, value]));
}

// Shared dealing logic for both the very first round (startGame) and every
// subsequent round dealt mid-game (playCard's round-end branch). Deals 1
// card to every participant, then immediately draws a 2nd card for whoever
// goes first so they can act the moment they see the table.
function dealRound(turnOrder, playerCount, startingUid) {
  const deck = shuffle(buildDeck(playerCount));
  const { reserveCard, setAsideVisible, drawPile } = dealSetup(deck, playerCount);

  const hands = {};
  let remaining = drawPile;
  for (const uid of turnOrder) {
    hands[uid] = [remaining[0]];
    remaining = remaining.slice(1);
  }
  hands[startingUid].push(remaining[0]);
  remaining = remaining.slice(1);

  return { hands, drawPile: remaining, reserveCard, reserveUsed: false, setAsideVisible };
}

function playerName(room, uid) {
  return room.players.find((p) => p.uid === uid)?.displayName || 'A player';
}

// Takes the Admin SDK Firestore instance (or a fake with the same tx/doc
// shape — see functions/test/fakeFirestore.js) and FieldValue, and returns
// plain onCall handler functions (request => result). Kept separate from
// index.js's initializeApp()/getFirestore() wiring so it's unit-testable
// without a real Firebase project or the emulator.
export function createHandlers({ db, FieldValue }) {
  const roomDoc = (roomId) => db.doc(`gameRooms/${roomId}`);
  const stateDoc = (roomId) => db.doc(`gameRooms/${roomId}/state/current`);
  const secretDoc = (roomId) => db.doc(`gameRooms/${roomId}/secret/deck`);
  const handDoc = (roomId, uid) => db.doc(`gameRooms/${roomId}/hands/${uid}`);
  const logCollection = (roomId) => db.collection(`gameRooms/${roomId}/log`);

  async function startGame(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId } = request.data || {};
    if (!roomId) throw new HttpsError('invalid-argument', 'roomId is required.');

    await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(roomDoc(roomId));
      if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found.');
      const room = roomSnap.data();

      if (room.hostUid !== uid) throw new HttpsError('permission-denied', 'Only the host can start the game.');
      if (room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'This room has already started or ended.');
      }

      const players = room.players || [];
      const playerCount = players.length;
      if (!bracketForPlayerCount(playerCount)) {
        throw new HttpsError(
          'failed-precondition',
          playerCount > 4
            ? '5-8 player games are coming soon — this room currently supports 2-4 players.'
            : 'Need at least 2 players to start.'
        );
      }

      const turnOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.uid);
      const firstPlayer = turnOrder[Math.floor(Math.random() * turnOrder.length)];
      const { hands, drawPile, reserveCard, reserveUsed, setAsideVisible } = dealRound(turnOrder, playerCount, firstPlayer);

      for (const [handUid, cards] of Object.entries(hands)) {
        tx.set(handDoc(roomId, handUid), { cards });
      }

      tx.set(secretDoc(roomId), { drawPile, reserveCard, reserveUsed });

      tx.set(stateDoc(roomId), {
        turnOrder,
        turnUid: firstPlayer,
        roundNumber: 1,
        turnNumber: 1,
        deckCount: drawPile.length,
        setAsideVisible,
        discardPiles: emptyMap(turnOrder, []),
        protected: emptyMap(turnOrder, false),
        eliminated: emptyMap(turnOrder, false),
        tokens: emptyMap(turnOrder, 0),
        tokensToWin: TOKENS_TO_WIN[playerCount],
        phase: 'playing',
        logSeq: 1,
      });

      tx.set(logCollection(roomId).doc(), {
        seq: 0,
        roundNumber: 1,
        message: 'Round 1 dealt.',
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(roomDoc(roomId), { status: 'active', updatedAt: FieldValue.serverTimestamp() });
    });

    return { success: true };
  }

  async function playCard(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, cardId, targetUid = null, guessCardId = null } = request.data || {};
    if (!roomId || !cardId) throw new HttpsError('invalid-argument', 'roomId and cardId are required.');

    const response = { success: true, peekedCard: null };

    await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap, secretSnap] = await Promise.all([
        tx.get(roomDoc(roomId)),
        tx.get(stateDoc(roomId)),
        tx.get(secretDoc(roomId)),
      ]);
      if (!roomSnap.exists || !stateSnap.exists || !secretSnap.exists) {
        throw new HttpsError('not-found', 'Game state not found.');
      }
      const room = roomSnap.data();
      const state = stateSnap.data();
      const secret = secretSnap.data();

      if (room.status !== 'active' || state.phase !== 'playing') {
        throw new HttpsError('failed-precondition', 'This game is not currently in progress.');
      }
      if (state.turnUid !== uid) throw new HttpsError('permission-denied', "It's not your turn.");

      const aliveUids = state.turnOrder.filter((u) => !state.eliminated[u]);
      const protectedUids = aliveUids.filter((u) => state.protected[u]);
      const others = aliveUids.filter((u) => u !== uid);

      const [callerHandSnap, ...otherHandSnaps] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        ...others.map((u) => tx.get(handDoc(roomId, u))),
      ]);
      const callerHand = callerHandSnap.data()?.cards || [];
      const hands = { [uid]: callerHand };
      others.forEach((u, i) => {
        hands[u] = otherHandSnaps[i].data()?.cards || [];
      });

      const legality = isLegalPlay({
        hand: callerHand,
        cardId,
        targetUid,
        guessCardId,
        callerUid: uid,
        aliveUids,
        protectedUids,
      });
      if (!legality.legal) throw new HttpsError('failed-precondition', `Illegal move: ${legality.reason}`);

      const effect = applyCardEffect({ cardId, callerUid: uid, targetUid, guessCardId, hands });
      if (cardId === 'priest' && effect.peek) response.peekedCard = effect.peek.card;

      // Prince-forced redraw: draw pile first, then the single face-down
      // reserve card if the draw pile is empty (its one documented use).
      let drawPile = [...secret.drawPile];
      let reserveUsed = secret.reserveUsed;
      if (effect.needsRedrawUid) {
        let drawnCard = null;
        if (drawPile.length > 0) {
          drawnCard = drawPile[0];
          drawPile = drawPile.slice(1);
        } else if (!reserveUsed) {
          drawnCard = secret.reserveCard;
          reserveUsed = true;
        }
        if (drawnCard) effect.newHands[effect.needsRedrawUid] = [drawnCard];
      }

      const discardPiles = { ...state.discardPiles };
      discardPiles[uid] = [...(discardPiles[uid] || []), cardId];
      for (const eliminatedUid of effect.eliminatedUids) {
        discardPiles[eliminatedUid] = [...(discardPiles[eliminatedUid] || []), ...(hands[eliminatedUid] || [])];
      }

      const protectedMap = { ...state.protected, [uid]: false };
      if (effect.protectUid) protectedMap[effect.protectUid] = true;

      const eliminatedMap = { ...state.eliminated };
      for (const eu of effect.eliminatedUids) eliminatedMap[eu] = true;

      const targetName = targetUid === uid ? 'themselves' : targetUid ? playerName(room, targetUid) : '';
      const logMessage = `${playerName(room, uid)} ${effect.logMessage.replace('{target}', targetName)}`;

      let nextLogSeq = state.logSeq;
      const appendLog = (message, roundNumber) => {
        tx.set(logCollection(roomId).doc(), {
          seq: nextLogSeq,
          roundNumber,
          message,
          createdAt: FieldValue.serverTimestamp(),
        });
        nextLogSeq += 1;
      };

      const aliveAfter = state.turnOrder.filter((u) => !eliminatedMap[u]);
      let roundWinners = null;
      let deckExhausted = false;

      if (aliveAfter.length === 1) {
        roundWinners = aliveAfter;
      } else {
        const nextUid = nextActiveUid(state.turnOrder, uid, state.turnOrder.filter((u) => eliminatedMap[u]));
        if (drawPile.length > 0) {
          const drawnCard = drawPile[0];
          drawPile = drawPile.slice(1);
          effect.newHands[nextUid] = [...(effect.newHands[nextUid] || hands[nextUid]), drawnCard];
        } else {
          deckExhausted = true;
          roundWinners = pickRoundWinners(aliveAfter, effect.newHands, discardPiles);
        }

        if (!deckExhausted) {
          appendLog(logMessage, state.roundNumber);
          for (const u of [uid, ...others]) {
            tx.set(handDoc(roomId, u), { cards: effect.newHands[u] });
          }
          tx.set(secretDoc(roomId), { drawPile, reserveCard: secret.reserveCard, reserveUsed });
          tx.update(stateDoc(roomId), {
            turnUid: nextUid,
            turnNumber: state.turnNumber + 1,
            deckCount: drawPile.length,
            discardPiles,
            protected: protectedMap,
            eliminated: eliminatedMap,
            logSeq: nextLogSeq,
          });
          return;
        }
      }

      // --- Round over (either last-player-standing or deck exhausted) ---
      appendLog(logMessage, state.roundNumber);
      for (const u of [uid, ...others]) {
        tx.set(handDoc(roomId, u), { cards: effect.newHands[u] });
      }

      const tokens = { ...state.tokens };
      for (const winnerUid of roundWinners) tokens[winnerUid] = (tokens[winnerUid] || 0) + 1;

      const winnerNames = roundWinners.map((u) => playerName(room, u)).join(' & ');
      appendLog(
        deckExhausted
          ? `Deck ran out — ${winnerNames} won round ${state.roundNumber} on hand value.`
          : `${winnerNames} won round ${state.roundNumber} — everyone else is out.`,
        state.roundNumber
      );

      const gameWinners = roundWinners.filter((u) => tokens[u] >= state.tokensToWin);

      if (gameWinners.length > 0) {
        appendLog(`${gameWinners.map((u) => playerName(room, u)).join(' & ')} won the game!`, state.roundNumber);

        for (const participantUid of state.turnOrder) {
          const userRef = db.doc(`users/${participantUid}`);
          tx.set(
            userRef,
            {
              stats: {
                'love-letter': {
                  gamesPlayed: FieldValue.increment(1),
                  wins: FieldValue.increment(gameWinners.includes(participantUid) ? 1 : 0),
                },
              },
            },
            { merge: true }
          );
        }

        tx.update(stateDoc(roomId), {
          phase: 'gameEnd',
          tokens,
          eliminated: eliminatedMap,
          discardPiles,
          logSeq: nextLogSeq,
        });
        tx.update(roomDoc(roomId), { status: 'completed', updatedAt: FieldValue.serverTimestamp() });
        return;
      }

      // Game continues — deal a fresh round. Elimination/protection reset
      // for everyone; tokens carry over. Next round's first player is the
      // round's winner (a random pick among tied winners).
      const nextRoundNumber = state.roundNumber + 1;
      const nextStarter = roundWinners[Math.floor(Math.random() * roundWinners.length)];
      const dealt = dealRound(state.turnOrder, state.turnOrder.length, nextStarter);

      for (const [handUid, cards] of Object.entries(dealt.hands)) {
        tx.set(handDoc(roomId, handUid), { cards });
      }
      tx.set(secretDoc(roomId), { drawPile: dealt.drawPile, reserveCard: dealt.reserveCard, reserveUsed: dealt.reserveUsed });

      appendLog(`Round ${nextRoundNumber} dealt.`, nextRoundNumber);

      tx.update(stateDoc(roomId), {
        turnUid: nextStarter,
        roundNumber: nextRoundNumber,
        turnNumber: 1,
        deckCount: dealt.drawPile.length,
        setAsideVisible: dealt.setAsideVisible,
        discardPiles: emptyMap(state.turnOrder, []),
        protected: emptyMap(state.turnOrder, false),
        eliminated: emptyMap(state.turnOrder, false),
        tokens,
        phase: 'playing',
        logSeq: nextLogSeq,
      });
    });

    return response;
  }

  return { startGame, playCard };
}
