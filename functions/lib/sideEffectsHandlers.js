import { HttpsError } from 'firebase-functions/v2/https';
import { buildDisorderPool, buildNonDisorderDeck, psycheSizeForPlayerCount, isValidRuleset } from './sideEffectsDeck.js';
import { shuffle } from './shuffle.js';
import { sendPushToUid, notifyGameStarted, SITE_ORIGIN, GAME_DISPLAY_NAMES, roomLabel } from './push.js';
import { dealPsyches, isLegalPlay, applyTreat, applyGiveDisorder, applyTherapy, applyEpisode, applyMisdiagnosis, applyHighTolerance, isPsycheFullyTreated, nextTurnUid } from './sideEffectsRules.js';

const HAND_CAP = 6;
const DRAW_PER_TURN = 2;

function emptyMap(uids, value) {
  return Object.fromEntries(uids.map((uid) => [uid, value]));
}

function playerName(room, uid) {
  return room.players.find((p) => p.uid === uid)?.displayName || 'A player';
}

// Draws up to `n` cards, reshuffling the discard pile into a fresh draw pile
// (mid-draw, if needed) the same way Love Letter's deck-exhaustion handling
// works — mutates nothing, returns new { drawn, drawPile, discardPile }.
function drawCards({ drawPile, discardPile, n }) {
  let pile = [...drawPile];
  let discard = [...discardPile];
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (pile.length === 0) {
      if (discard.length === 0) break;
      pile = shuffle(discard);
      discard = [];
    }
    drawn.push(pile[0]);
    pile = pile.slice(1);
  }
  return { drawn, drawPile: pile, discardPile: discard };
}

// Takes the Admin SDK Firestore instance (or a fake with the same tx/doc
// shape — see functions/test/fakeFirestore.js), FieldValue, and a Messaging
// client, returns plain onCall handler functions (request => result). Same
// factory shape as createHandlers()/createWordyHandlers().
export function createHandlers({ db, FieldValue, messaging }) {
  const roomDoc = (roomId) => db.doc(`gameRooms/${roomId}`);
  const stateDoc = (roomId) => db.doc(`gameRooms/${roomId}/state/current`);
  const secretDoc = (roomId) => db.doc(`gameRooms/${roomId}/secret/deck`);
  const handDoc = (roomId, uid) => db.doc(`gameRooms/${roomId}/hands/${uid}`);
  const logCollection = (roomId) => db.collection(`gameRooms/${roomId}/log`);
  const activityCollection = (uid) => db.collection(`users/${uid}/activity`);

  function appendLogEntry(tx, roomId, seq, message) {
    tx.set(logCollection(roomId).doc(), { seq, message, createdAt: FieldValue.serverTimestamp() });
  }

  async function sendTurnNotification({ roomId, room, uid }) {
    const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
    await sendPushToUid({
      db,
      FieldValue,
      messaging,
      uid,
      notification: { title: "It's your turn!", body: `It's your move in ${gameName} — ${roomLabel(room)}.` },
      link: `${SITE_ORIGIN}/rooms/${roomId}`,
    });
  }

  function logGameActivity(tx, { room, roomId, participantUids, winnerUid }) {
    for (const participantUid of participantUids) {
      tx.set(activityCollection(participantUid).doc(), {
        type: participantUid === winnerUid ? 'game_won' : 'game_lost',
        gameType: room.gameType,
        roomId,
        roomCode: room.code,
        roomName: room.name || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // --- Setup -----------------------------------------------------------

  async function dealPsychesHandler(request) {
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
      if (playerCount < 2) throw new HttpsError('failed-precondition', 'Need at least 2 players to start.');

      const ruleset = isValidRuleset(room.settings?.ruleset) ? room.settings.ruleset : 'base';
      const turnOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.uid);
      const firstPlayer = turnOrder[Math.floor(Math.random() * turnOrder.length)];

      const psycheSize = psycheSizeForPlayerCount(playerCount);
      const shuffledDisorders = shuffle(buildDisorderPool(ruleset));
      const { psyches, leftoverDisorders } = dealPsyches(shuffledDisorders, turnOrder, psycheSize);

      const restDeck = shuffle([...buildNonDisorderDeck(ruleset), ...leftoverDisorders]);
      const hands = {};
      let remaining = restDeck;
      for (const playerUid of turnOrder) {
        hands[playerUid] = remaining.slice(0, 4);
        remaining = remaining.slice(4);
      }

      for (const [handUid, cards] of Object.entries(hands)) {
        tx.set(handDoc(roomId, handUid), { cards });
      }

      tx.set(secretDoc(roomId), { drawPile: remaining, discardPile: [] });

      tx.set(stateDoc(roomId), {
        ruleset,
        turnOrder,
        turnUid: firstPlayer,
        turnNumber: 1,
        movesThisTurn: 0,
        deckCount: remaining.length,
        discardCount: 0,
        psyches,
        restrictions: emptyMap(turnOrder, {}),
        phase: 'playing',
        winnerUid: null,
        logSeq: 1,
      });

      tx.set(logCollection(roomId).doc(), { seq: 0, message: 'Psyches dealt.', createdAt: FieldValue.serverTimestamp() });
      tx.update(roomDoc(roomId), { status: 'active', updatedAt: FieldValue.serverTimestamp() });

      return { firstPlayer, room, turnOrder };
    });

    await sendTurnNotification({ roomId, room, uid: firstPlayer });
    await notifyGameStarted({ db, FieldValue, messaging, room, roomId, turnOrder, notifyUid: firstPlayer });

    return { success: true };
  }

  // --- Actions -----------------------------------------------------------

  // Dispatches one of the 6 action types to its pure apply* function and
  // computes which cards leave circulation into the discard pile — the
  // Drug/Disorder cards actively "in play" on a Psyche are never discarded,
  // only the action card itself (Therapy/Episode/Misdiagnosis/High
  // Tolerance) and, for Madness/High Tolerance, any Drug it knocks off.
  function resolveAction({ actionType, cardId, callerUid, targetUid, targetDisorderId, ownDisorderId, handDisorderId, hand, hands, psyches }) {
    switch (actionType) {
      case 'treat': {
        const { newPsyches, newHand, logMessage } = applyTreat({ callerUid, cardId, hand, psyches });
        return { newPsyches, hands: { [callerUid]: newHand }, discarded: [], logMessage };
      }
      case 'giveDisorder': {
        const { newPsyches, newHand, logMessage } = applyGiveDisorder({ targetUid, cardId, hand, psyches });
        return { newPsyches, hands: { [callerUid]: newHand }, discarded: [], logMessage };
      }
      case 'therapy': {
        const { newPsyches, newHand, logMessage } = applyTherapy({ callerUid, ownDisorderId, hand, psyches });
        return { newPsyches, hands: { [callerUid]: newHand }, discarded: [ownDisorderId, 'therapy'], logMessage };
      }
      case 'episode': {
        const { newPsyches, newHands, logMessage, persistentRestriction } = applyEpisode({
          callerUid,
          targetUid,
          targetDisorderId,
          psyches,
          hands,
          pickRandom: (arr) => arr[Math.floor(Math.random() * arr.length)],
        });
        // Only Madness can knock drugs off — the rest never touch drugId.
        const discarded = ['episode'];
        if (targetDisorderId === 'madness') {
          for (const entry of psyches[targetUid]) {
            if (entry.drugId) discarded.push(entry.drugId);
          }
        }
        return { newPsyches, hands: newHands, discarded, logMessage, persistentRestriction };
      }
      case 'misdiagnosis': {
        const { newPsyches, newHand, logMessage } = applyMisdiagnosis({ callerUid, ownDisorderId, handDisorderId, hand, psyches });
        return { newPsyches, hands: { [callerUid]: newHand }, discarded: ['misdiagnosis'], logMessage };
      }
      case 'highTolerance': {
        const removedDrugId = psyches[targetUid].find((e) => e.disorderId === targetDisorderId)?.drugId;
        const { newPsyches, newHand, logMessage } = applyHighTolerance({ targetUid, targetDisorderId, hand, psyches });
        return {
          newPsyches,
          hands: { [callerUid]: newHand },
          discarded: removedDrugId ? ['highTolerance', removedDrugId] : ['highTolerance'],
          logMessage,
        };
      }
      default:
        throw new HttpsError('invalid-argument', `Unknown actionType: ${actionType}`);
    }
  }

  async function playAction(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, actionType, cardId, targetUid = null, targetDisorderId = null, ownDisorderId = null, handDisorderId = null } =
      request.data || {};
    if (!roomId || !actionType || !cardId) {
      throw new HttpsError('invalid-argument', 'roomId, actionType, and cardId are required.');
    }

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
      if (state.movesThisTurn >= 2) throw new HttpsError('failed-precondition', "You've already played 2 cards this turn.");

      const needsTargetHand = actionType === 'episode';
      const [callerHandSnap, targetHandSnap] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        needsTargetHand ? tx.get(handDoc(roomId, targetUid)) : Promise.resolve(null),
      ]);
      const callerHand = callerHandSnap.data()?.cards || [];
      const hands = { [uid]: callerHand };
      if (needsTargetHand) hands[targetUid] = targetHandSnap.data()?.cards || [];

      const legality = isLegalPlay({
        actionType,
        hand: callerHand,
        cardId,
        callerUid: uid,
        targetUid,
        targetDisorderId,
        ownDisorderId,
        handDisorderId,
        psyches: state.psyches,
        restrictions: state.restrictions,
        ruleset: state.ruleset,
      });
      if (!legality.legal) throw new HttpsError('failed-precondition', `Illegal move: ${legality.reason}`);

      const result = resolveAction({
        actionType,
        cardId,
        callerUid: uid,
        targetUid,
        targetDisorderId,
        ownDisorderId,
        handDisorderId,
        hand: callerHand,
        hands,
        psyches: state.psyches,
      });

      for (const [handUid, cards] of Object.entries(result.hands)) {
        tx.set(handDoc(roomId, handUid), { cards });
      }

      const discardPile = [...secret.discardPile, ...result.discarded];
      tx.set(secretDoc(roomId), { drawPile: secret.drawPile, discardPile });

      const restrictions = { ...state.restrictions };
      if (result.persistentRestriction) {
        restrictions[targetUid] = { ...restrictions[targetUid], [result.persistentRestriction]: true };
      }

      const targetName = targetUid ? playerName(room, targetUid) : '';
      const logMessage = `${playerName(room, uid)} ${result.logMessage.replace('{target}', targetName)}`;
      appendLogEntry(tx, roomId, state.logSeq, logMessage);

      // Only Treat/Therapy can newly complete a Psyche (Give-a-Disorder adds
      // an untreated entry, Misdiagnosis always swaps in a fresh untreated
      // one, High Tolerance only un-treats — none of those can create a win).
      let winnerUid = null;
      if (actionType === 'treat' || actionType === 'therapy') {
        if (isPsycheFullyTreated(result.newPsyches[uid])) winnerUid = uid;
      }

      if (winnerUid) {
        appendLogEntry(tx, roomId, state.logSeq + 1, `${playerName(room, winnerUid)} treated every Disorder — they win!`);
        tx.update(stateDoc(roomId), {
          psyches: result.newPsyches,
          restrictions,
          discardCount: discardPile.length,
          phase: 'gameEnd',
          winnerUid,
          logSeq: state.logSeq + 2,
        });
        tx.update(roomDoc(roomId), { status: 'completed', updatedAt: FieldValue.serverTimestamp() });
        for (const participantUid of state.turnOrder) {
          tx.set(
            db.doc(`users/${participantUid}`),
            {
              stats: {
                'side-effects': {
                  gamesPlayed: FieldValue.increment(1),
                  wins: FieldValue.increment(participantUid === winnerUid ? 1 : 0),
                },
              },
            },
            { merge: true }
          );
        }
        logGameActivity(tx, { room, roomId, participantUids: state.turnOrder, winnerUid });
        return;
      }

      tx.update(stateDoc(roomId), {
        psyches: result.newPsyches,
        restrictions,
        movesThisTurn: state.movesThisTurn + 1,
        discardCount: discardPile.length,
        logSeq: state.logSeq + 1,
      });
    });

    return { success: true };
  }

  // --- Ending a turn -------------------------------------------------------

  async function endTurn(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, discardCardIds = [] } = request.data || {};
    if (!roomId) throw new HttpsError('invalid-argument', 'roomId is required.');

    const { notifyUid, room } = await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap, secretSnap, callerHandSnap] = await Promise.all([
        tx.get(roomDoc(roomId)),
        tx.get(stateDoc(roomId)),
        tx.get(secretDoc(roomId)),
        tx.get(handDoc(roomId, uid)),
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

      let callerHand = callerHandSnap.data()?.cards || [];
      let discardPile = [...secret.discardPile];
      let needsCallerHandWrite = false;

      // Hand-cap-6 cleanup — the player chose which extras to discard.
      // Computed now, written later (every read has to happen before any
      // write in a real Firestore transaction).
      if (callerHand.length > HAND_CAP) {
        const needed = callerHand.length - HAND_CAP;
        if (discardCardIds.length !== needed || !discardCardIds.every((c) => callerHand.includes(c))) {
          throw new HttpsError('failed-precondition', `Choose exactly ${needed} card(s) from your hand to discard.`);
        }
        const remaining = [...callerHand];
        for (const cardId of discardCardIds) remaining.splice(remaining.indexOf(cardId), 1);
        callerHand = remaining;
        discardPile = [...discardPile, ...discardCardIds];
        needsCallerHandWrite = true;
      }

      // Restriction bookkeeping is pure — derived entirely from the
      // already-loaded `state`, no extra reads needed for this part.
      const restrictions = { ...state.restrictions };
      const psyches = { ...state.psyches };
      function clearRestriction(targetUid, kind) {
        restrictions[targetUid] = { ...restrictions[targetUid], [kind]: false };
        psyches[targetUid] = psyches[targetUid].map((e) => (e.episodeActive === kind ? { ...e, episodeActive: null } : e));
      }
      if (restrictions[uid]?.impotence) clearRestriction(uid, 'impotence');

      let nextUid = nextTurnUid(state.turnOrder, uid);
      const logs = [];

      // Depression skips the arriving player's entire turn (no draw, no
      // play) — loop in case several consecutive players are all flagged,
      // bounded by turnOrder.length so a pathological state can't hang.
      for (let i = 0; i < state.turnOrder.length; i++) {
        if (!restrictions[nextUid]?.depression) break;
        clearRestriction(nextUid, 'depression');
        logs.push(`${playerName(room, nextUid)} sits out this turn (Depression).`);
        nextUid = nextTurnUid(state.turnOrder, nextUid);
      }

      const skipDraw = Boolean(restrictions[nextUid]?.anorexia);
      if (skipDraw) clearRestriction(nextUid, 'anorexia');

      // Now that the final arriving player is known, read their current
      // hand — this is the last read, still strictly before any write.
      const nextHandSnap = await tx.get(handDoc(roomId, nextUid));
      const nextHandBefore = nextHandSnap.data()?.cards || [];

      let drawPile = secret.drawPile;
      let drawnCards = [];
      if (skipDraw) {
        logs.push(`${playerName(room, nextUid)} doesn't draw this turn (Anorexia).`);
      } else {
        const drawResult = drawCards({ drawPile, discardPile, n: DRAW_PER_TURN });
        drawnCards = drawResult.drawn;
        drawPile = drawResult.drawPile;
        discardPile = drawResult.discardPile;
      }
      logs.push(`${playerName(room, nextUid)}'s turn.`);

      // --- Writes (every read above has already happened) ---
      if (needsCallerHandWrite) tx.set(handDoc(roomId, uid), { cards: callerHand });
      if (!skipDraw) tx.set(handDoc(roomId, nextUid), { cards: [...nextHandBefore, ...drawnCards] });

      let nextLogSeq = state.logSeq;
      for (const message of logs) {
        appendLogEntry(tx, roomId, nextLogSeq, message);
        nextLogSeq += 1;
      }

      tx.set(secretDoc(roomId), { drawPile, discardPile });
      tx.update(stateDoc(roomId), {
        turnUid: nextUid,
        turnNumber: state.turnNumber + 1,
        movesThisTurn: 0,
        deckCount: drawPile.length,
        discardCount: discardPile.length,
        psyches,
        restrictions,
        logSeq: nextLogSeq,
      });

      return { notifyUid: nextUid, room };
    });

    await sendTurnNotification({ roomId, room, uid: notifyUid });

    return { success: true };
  }

  return { dealPsyches: dealPsychesHandler, playAction, endTurn };
}
