import { HttpsError } from 'firebase-functions/v2/https';
import { buildDeck, bracketForPlayerCount, isValidRulesetForPlayerCount, TOKENS_TO_WIN } from './deck.js';
import { shuffle } from './shuffle.js';
import { sendPushToUid, SITE_ORIGIN, GAME_DISPLAY_NAMES } from './push.js';
import {
  dealSetup,
  isLegalPlay,
  applyCardEffect,
  pickRoundWinners,
  nextActiveUid,
  spyBonusUid,
} from './rules.js';

function emptyMap(uids, value) {
  return Object.fromEntries(uids.map((uid) => [uid, value]));
}

// Shared dealing logic for both the very first round (startGame) and every
// subsequent round dealt mid-game (finishTurn's round-end branch). Deals 1
// card to every participant, then immediately draws a 2nd card for whoever
// goes first so they can act the moment they see the table.
function dealRound(turnOrder, playerCount, startingUid, ruleset) {
  const deck = shuffle(buildDeck(playerCount, ruleset));
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

// A room's stored settings.ruleset can drift from what's actually valid if
// the real headcount by start time differs from the host's original target
// (people join/leave the lobby freely). Use the stored ruleset if it still
// fits, otherwise fall back to the default bracket for however many players
// actually showed up.
function effectiveRuleset(room, playerCount) {
  const stored = room.settings?.ruleset;
  return isValidRulesetForPlayerCount(stored, playerCount) ? stored : bracketForPlayerCount(playerCount);
}

// Takes the Admin SDK Firestore instance (or a fake with the same tx/doc
// shape — see functions/test/fakeFirestore.js), FieldValue, and a Messaging
// client (or a fake — { sendEachForMulticast }), and returns plain onCall
// handler functions (request => result). Kept separate from index.js's
// initializeApp()/getFirestore() wiring so it's unit-testable without a
// real Firebase project or the emulator.
export function createHandlers({ db, FieldValue, messaging }) {
  const roomDoc = (roomId) => db.doc(`gameRooms/${roomId}`);
  const stateDoc = (roomId) => db.doc(`gameRooms/${roomId}/state/current`);
  const secretDoc = (roomId) => db.doc(`gameRooms/${roomId}/secret/deck`);
  const handDoc = (roomId, uid) => db.doc(`gameRooms/${roomId}/hands/${uid}`);
  const logCollection = (roomId) => db.collection(`gameRooms/${roomId}/log`);

  function appendLogEntry(tx, roomId, seq, message, roundNumber) {
    tx.set(logCollection(roomId).doc(), {
      seq,
      roundNumber,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Pushes a "your turn" notification to every device `uid` has registered.
  // Always called AFTER a transaction has committed, never from inside one
  // — Firestore transactions can retry on contention, and a network send
  // inside one risks firing twice.
  async function sendTurnNotification({ roomId, room, uid }) {
    const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
    await sendPushToUid({
      db,
      FieldValue,
      messaging,
      uid,
      notification: {
        title: "It's your turn!",
        body: `It's your move in ${gameName} — Room ${room.code}.`,
      },
      link: `${SITE_ORIGIN}/rooms/${roomId}`,
    });
  }

  const activityCollection = (uid) => db.collection(`users/${uid}/activity`);

  // Records a game_won/game_lost entry in every participant's activity
  // feed — called from finishTurn's game-end branch, inside the same
  // transaction as the stats increment right above it so both land
  // atomically (or neither does, if the transaction retries/fails).
  function logGameActivity(tx, { room, roomId, participantUids, gameWinners }) {
    for (const participantUid of participantUids) {
      tx.set(activityCollection(participantUid).doc(), {
        type: gameWinners.includes(participantUid) ? 'game_won' : 'game_lost',
        gameType: room.gameType,
        roomId,
        roomCode: room.code,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // Shared tail for both a normal playCard turn and a Chancellor resolution
  // (resolveChancellor) — advances to the next player, or ends the round /
  // game / deals a fresh round, given the fully-resolved state of this turn.
  // `hands` must already contain every currently-alive uid's up-to-date
  // cards — no lazy reads happen in here, since Firestore transactions
  // require all reads to happen before any writes, and both call sites are
  // responsible for front-loading their reads before calling this. Returns
  // `{ notifyUid }` — whoever's turn just started, or null if the game just
  // ended — for the caller to send a turn notification AFTER the
  // transaction this runs inside of has committed.
  function finishTurn({
    tx,
    roomId,
    room,
    state,
    actingUid,
    hands,
    drawPile,
    reserveCard,
    reserveUsed,
    discardPiles,
    protectedMap,
    eliminatedMap,
    logMessage,
    logSeq,
  }) {
    let nextLogSeq = logSeq;
    const log = (message, roundNumber) => {
      appendLogEntry(tx, roomId, nextLogSeq, message, roundNumber);
      nextLogSeq += 1;
    };

    const aliveAfter = state.turnOrder.filter((u) => !eliminatedMap[u]);
    let roundWinners = null;
    let deckExhausted = false;
    let workingDrawPile = drawPile;

    if (aliveAfter.length === 1) {
      roundWinners = aliveAfter;
    } else {
      const nextUid = nextActiveUid(state.turnOrder, actingUid, state.turnOrder.filter((u) => eliminatedMap[u]));
      if (workingDrawPile.length > 0) {
        const drawnCard = workingDrawPile[0];
        workingDrawPile = workingDrawPile.slice(1);
        hands[nextUid] = [...(hands[nextUid] || []), drawnCard];
      } else {
        deckExhausted = true;
        roundWinners = pickRoundWinners(aliveAfter, hands, discardPiles);
      }

      if (!deckExhausted) {
        if (logMessage) log(logMessage, state.roundNumber);
        for (const u of Object.keys(hands)) {
          tx.set(handDoc(roomId, u), { cards: hands[u] });
        }
        tx.set(secretDoc(roomId), { drawPile: workingDrawPile, reserveCard, reserveUsed });
        tx.update(stateDoc(roomId), {
          turnUid: nextUid,
          turnNumber: state.turnNumber + 1,
          deckCount: workingDrawPile.length,
          discardPiles,
          protected: protectedMap,
          eliminated: eliminatedMap,
          phase: 'playing',
          logSeq: nextLogSeq,
        });
        return { notifyUid: nextUid };
      }
    }

    // --- Round over (either last-player-standing or deck exhausted) ---
    if (logMessage) log(logMessage, state.roundNumber);
    for (const u of Object.keys(hands)) {
      tx.set(handDoc(roomId, u), { cards: hands[u] });
    }

    // Spy's bonus token is independent of who won the round on cards.
    const spyUid = spyBonusUid(aliveAfter, discardPiles);

    const tokens = { ...state.tokens };
    for (const winnerUid of roundWinners) tokens[winnerUid] = (tokens[winnerUid] || 0) + 1;
    if (spyUid) tokens[spyUid] = (tokens[spyUid] || 0) + 1;

    const winnerNames = roundWinners.map((u) => playerName(room, u)).join(' & ');
    log(
      deckExhausted
        ? `Deck ran out — ${winnerNames} won round ${state.roundNumber} on hand value.`
        : `${winnerNames} won round ${state.roundNumber} — everyone else is out.`,
      state.roundNumber
    );
    if (spyUid) {
      log(`${playerName(room, spyUid)} was the only Spy left in the round — bonus token!`, state.roundNumber);
    }

    // Checked across everyone, not just this round's winners — the Spy
    // bonus is a second, independent way to reach tokensToWin.
    const gameWinners = state.turnOrder.filter((u) => tokens[u] >= state.tokensToWin);

    if (gameWinners.length > 0) {
      log(`${gameWinners.map((u) => playerName(room, u)).join(' & ')} won the game!`, state.roundNumber);

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
      logGameActivity(tx, { room, roomId, participantUids: state.turnOrder, gameWinners });

      tx.update(stateDoc(roomId), {
        phase: 'gameEnd',
        tokens,
        eliminated: eliminatedMap,
        discardPiles,
        logSeq: nextLogSeq,
      });
      tx.update(roomDoc(roomId), { status: 'completed', updatedAt: FieldValue.serverTimestamp() });
      return { notifyUid: null };
    }

    // Game continues — deal a fresh round. Elimination/protection reset
    // for everyone; tokens carry over. Next round's first player is the
    // round's winner (a random pick among tied winners).
    const nextRoundNumber = state.roundNumber + 1;
    const nextStarter = roundWinners[Math.floor(Math.random() * roundWinners.length)];
    const dealt = dealRound(state.turnOrder, state.turnOrder.length, nextStarter, state.ruleset);

    for (const [handUid, cards] of Object.entries(dealt.hands)) {
      tx.set(handDoc(roomId, handUid), { cards });
    }
    tx.set(secretDoc(roomId), {
      drawPile: dealt.drawPile,
      reserveCard: dealt.reserveCard,
      reserveUsed: dealt.reserveUsed,
    });

    log(`Round ${nextRoundNumber} dealt.`, nextRoundNumber);

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

    return { notifyUid: nextStarter };
  }

  async function startGame(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId } = request.data || {};
    if (!roomId) throw new HttpsError('invalid-argument', 'roomId is required.');

    const { firstPlayer, room, turnOrder } = await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(roomDoc(roomId));
      if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found.');
      const room = roomSnap.data();

      if (room.hostUid !== uid) throw new HttpsError('permission-denied', 'Only the host can start the game.');
      if (room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'This room has already started or ended.');
      }

      const players = room.players || [];
      const playerCount = players.length;
      const ruleset = effectiveRuleset(room, playerCount);
      if (!ruleset) {
        throw new HttpsError(
          'failed-precondition',
          playerCount > 6
            ? '7-8 player games are coming soon — this room currently supports 2-6 players.'
            : 'Need at least 2 players to start.'
        );
      }

      const turnOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.uid);
      const firstPlayer = turnOrder[Math.floor(Math.random() * turnOrder.length)];
      const { hands, drawPile, reserveCard, reserveUsed, setAsideVisible } = dealRound(
        turnOrder,
        playerCount,
        firstPlayer,
        ruleset
      );

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
        ruleset,
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

      return { firstPlayer, room, turnOrder };
    });

    await sendTurnNotification({ roomId, room, uid: firstPlayer });

    // Everyone in the game gets a "game starting" activity entry, but only
    // non-first players get a push for it — the first player already gets
    // the more specific "It's your turn!" push above, and sending both
    // back-to-back to the same person would just be noise.
    const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
    await Promise.all(
      turnOrder.map(async (participantUid) => {
        await activityCollection(participantUid).doc().set({
          type: 'game_started',
          gameType: room.gameType,
          roomId,
          roomCode: room.code,
          createdAt: FieldValue.serverTimestamp(),
        });
        if (participantUid === firstPlayer) return;
        await sendPushToUid({
          db,
          FieldValue,
          messaging,
          uid: participantUid,
          notification: { title: 'Game starting!', body: `${gameName} in Room ${room.code} is starting now.` },
          link: `${SITE_ORIGIN}/rooms/${roomId}`,
        });
      })
    );

    return { success: true };
  }

  async function playCard(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, cardId, targetUid = null, guessCardId = null } = request.data || {};
    if (!roomId || !cardId) throw new HttpsError('invalid-argument', 'roomId and cardId are required.');

    const response = { success: true, peekedCard: null };

    const { notifyUid, room } = await db.runTransaction(async (tx) => {
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

      // Chancellor: draw up to 2 cards into the caller's hand and pause the
      // turn for them to choose 1 to keep (resolveChancellor finishes it).
      // Same player continues, so no turn notification here. If the deck is
      // completely empty, Chancellor has no effect and the turn proceeds
      // exactly like any other untargeted card below.
      if (cardId === 'chancellor' && drawPile.length > 0) {
        const drawn = drawPile.slice(0, 2);
        drawPile = drawPile.slice(drawn.length);
        effect.newHands[uid] = [...effect.newHands[uid], ...drawn];

        appendLogEntry(tx, roomId, state.logSeq, logMessage, state.roundNumber);
        tx.set(handDoc(roomId, uid), { cards: effect.newHands[uid] });
        tx.set(secretDoc(roomId), { drawPile, reserveCard: secret.reserveCard, reserveUsed });
        tx.update(stateDoc(roomId), {
          phase: 'chancellorPending',
          deckCount: drawPile.length,
          discardPiles,
          protected: protectedMap,
          eliminated: eliminatedMap,
          logSeq: state.logSeq + 1,
        });
        return { notifyUid: null, room };
      }

      const result = finishTurn({
        tx,
        roomId,
        room,
        state,
        actingUid: uid,
        hands: effect.newHands,
        drawPile,
        reserveCard: secret.reserveCard,
        reserveUsed,
        discardPiles,
        protectedMap,
        eliminatedMap,
        logMessage,
        logSeq: state.logSeq,
      });
      return { ...result, room };
    });

    await sendTurnNotification({ roomId, room, uid: notifyUid });

    return response;
  }

  async function resolveChancellor(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, keepCardId } = request.data || {};
    if (!roomId || !keepCardId) throw new HttpsError('invalid-argument', 'roomId and keepCardId are required.');

    const { notifyUid, room } = await db.runTransaction(async (tx) => {
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

      if (room.status !== 'active' || state.phase !== 'chancellorPending') {
        throw new HttpsError('failed-precondition', 'No Chancellor decision is pending.');
      }
      if (state.turnUid !== uid) throw new HttpsError('permission-denied', "It's not your turn.");

      const aliveUids = state.turnOrder.filter((u) => !state.eliminated[u]);
      const others = aliveUids.filter((u) => u !== uid);

      // Front-load every read before any writes (real Firestore transaction
      // requirement) even though only the caller's hand actually changes.
      const [callerHandSnap, ...otherHandSnaps] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        ...others.map((u) => tx.get(handDoc(roomId, u))),
      ]);
      const callerHand = callerHandSnap.data()?.cards || [];
      if (!callerHand.includes(keepCardId)) {
        throw new HttpsError('failed-precondition', "That card isn't in your hand.");
      }

      const hands = {};
      others.forEach((u, i) => {
        hands[u] = otherHandSnaps[i].data()?.cards || [];
      });

      const returned = [...callerHand];
      returned.splice(returned.indexOf(keepCardId), 1);
      hands[uid] = [keepCardId];

      const drawPile = [...secret.drawPile, ...returned];

      const result = finishTurn({
        tx,
        roomId,
        room,
        state,
        actingUid: uid,
        hands,
        drawPile,
        reserveCard: secret.reserveCard,
        reserveUsed: secret.reserveUsed,
        discardPiles: state.discardPiles,
        protectedMap: state.protected,
        eliminatedMap: state.eliminated,
        logMessage: null,
        logSeq: state.logSeq,
      });
      return { ...result, room };
    });

    await sendTurnNotification({ roomId, room, uid: notifyUid });

    return { success: true };
  }

  return { startGame, playCard, resolveChancellor };
}
