import { HttpsError } from 'firebase-functions/v2/https';
import { shuffle } from './shuffle.js';
import { dealTiles as drawTiles } from './wordyDeck.js';
import { selectCluePool } from './wordyClues.js';
import { isValidWord } from './dictionary.js';
import { isSpellable, resolveClue, checkAndMaybeCompleteGame } from './wordyRules.js';
import { sendPushToUid, notifyGameStarted, SITE_ORIGIN, GAME_DISPLAY_NAMES, roomLabel } from './push.js';

const MAX_SECRET_WORD_LENGTH = 11;
const TIEBREAKER_WORD_LENGTH = 4;
const RHYME_TIME_CLUE_ID = 'rhyme-time';
const RHYME_TIME_VALUE = 5;
const WRONG_GUESS_PENALTY = 2;

function playerName(room, uid) {
  return (room.players || []).find((p) => p.uid === uid)?.displayName || 'A player';
}

function normalizeWord(word) {
  return typeof word === 'string' ? word.trim().toUpperCase() : '';
}

function otherUid(turnOrder, uid) {
  return turnOrder.find((u) => u !== uid);
}

// Takes the Admin SDK Firestore instance (or functions/test/fakeFirestore.js),
// FieldValue, Messaging, and returns plain onCall handler functions — same
// factory shape as functions/lib/handlers.js#createHandlers (Love Letter),
// kept in its own module since the two games share no state shape.
export function createWordyHandlers({ db, FieldValue, messaging }) {
  const roomDoc = (roomId) => db.doc(`gameRooms/${roomId}`);
  const stateDoc = (roomId) => db.doc(`gameRooms/${roomId}/state/current`);
  const handDoc = (roomId, uid) => db.doc(`gameRooms/${roomId}/hands/${uid}`);
  const logCollection = (roomId) => db.collection(`gameRooms/${roomId}/log`);
  const activityCollection = (uid) => db.collection(`users/${uid}/activity`);

  // `extra` carries structured fields (kind/clueId/activatorUid/aboutUid/
  // guesserUid/correct/guess) for entries the frontend's CluesRecord panel
  // filters on — message text alone isn't queryable client-side. Entries
  // with no `extra` (dealing, word-locked, swap) are plain log lines that
  // CluesRecord ignores (no `kind` to match).
  function appendLogEntry(tx, roomId, seq, message, extra = {}) {
    tx.set(logCollection(roomId).doc(), {
      seq,
      roundNumber: null, // unused for Wordy — kept for shape parity with Love Letter's log entries
      message,
      createdAt: FieldValue.serverTimestamp(),
      ...extra,
    });
  }

  // Stats increment + game_won/game_lost activity entries, same pattern as
  // handlers.js#logGameActivity — called from whichever handler sets
  // phase: 'completed'.
  function completeGame(tx, { roomId, room, turnOrder, winnerUid }) {
    for (const participantUid of turnOrder) {
      tx.set(
        db.doc(`users/${participantUid}`),
        {
          stats: {
            'a-little-wordy': {
              gamesPlayed: FieldValue.increment(1),
              wins: FieldValue.increment(participantUid === winnerUid ? 1 : 0),
            },
          },
        },
        { merge: true }
      );
      tx.set(activityCollection(participantUid).doc(), {
        type: participantUid === winnerUid ? 'game_won' : 'game_lost',
        gameType: 'a-little-wordy',
        roomId,
        roomCode: room.code,
        roomName: room.name || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(roomDoc(roomId), { status: 'completed', updatedAt: FieldValue.serverTimestamp() });
  }

  async function dealTiles(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId } = request.data || {};
    if (!roomId) throw new HttpsError('invalid-argument', 'roomId is required.');

    const { room, turnOrder } = await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(roomDoc(roomId));
      if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found.');
      const room = roomSnap.data();

      if (room.hostUid !== uid) throw new HttpsError('permission-denied', 'Only the host can start the game.');
      if (room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'This room has already started or ended.');
      }
      const players = room.players || [];
      if (players.length !== 2) {
        throw new HttpsError('failed-precondition', 'A Little Wordy needs exactly 2 players to start.');
      }

      const turnOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.uid);
      const [uidA, uidB] = turnOrder;
      const dealt = drawTiles(shuffle);
      const availableClues = selectCluePool(shuffle);

      for (const [handUid, tiles] of [
        [uidA, dealt.playerA],
        [uidB, dealt.playerB],
      ]) {
        tx.set(handDoc(roomId, handUid), {
          originalTiles: tiles,
          tilesInFront: tiles, // pre-swap: each player looks at their own tiles to build their word
          secretWord: null,
          tiebreakerWord: null,
        });
      }

      tx.set(stateDoc(roomId), {
        phase: 'wordSubmission',
        turnUid: null, // word submission isn't turn-based — both players act independently
        turnOrder,
        tokens: { [uidA]: 0, [uidB]: 0 },
        guessedCorrectly: { [uidA]: false, [uidB]: false },
        availableClues,
        revealed: { [uidA]: [], [uidB]: [] },
        pendingClue: null,
        winnerUid: null,
        logSeq: 1,
      });

      tx.set(logCollection(roomId).doc(), {
        seq: 0,
        roundNumber: null,
        message: 'Tiles dealt — build your Secret Word!',
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(roomDoc(roomId), { status: 'active', updatedAt: FieldValue.serverTimestamp() });

      return { room, turnOrder };
    });

    // Nobody has "the turn" yet (word submission is simultaneous), so
    // notifyUid is null — everyone gets the generic "Game starting!" push,
    // no one is skipped for a more specific "it's your turn" push.
    await notifyGameStarted({ db, FieldValue, messaging, room, roomId, turnOrder, notifyUid: null });

    return { success: true };
  }

  async function submitSecretWord(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, word } = request.data || {};
    const normalized = normalizeWord(word);
    if (!roomId || !normalized) throw new HttpsError('invalid-argument', 'roomId and word are required.');

    const { room, turnOrder, notifyUid } = await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap] = await Promise.all([tx.get(roomDoc(roomId)), tx.get(stateDoc(roomId))]);
      if (!roomSnap.exists || !stateSnap.exists) throw new HttpsError('not-found', 'Game state not found.');
      const room = roomSnap.data();
      const state = stateSnap.data();
      if (room.status !== 'active' || state.phase !== 'wordSubmission') {
        throw new HttpsError('failed-precondition', 'Word submission is not currently open.');
      }

      const opponentUid = otherUid(state.turnOrder, uid);
      const [ownSnap, opponentSnap] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        tx.get(handDoc(roomId, opponentUid)),
      ]);
      if (!ownSnap.exists || !opponentSnap.exists) throw new HttpsError('not-found', 'Hand not found.');
      const own = ownSnap.data();
      const opponent = opponentSnap.data();

      if (own.secretWord) throw new HttpsError('failed-precondition', "You've already submitted a word.");
      if (normalized.length > MAX_SECRET_WORD_LENGTH || !isSpellable(normalized, own.originalTiles) || !isValidWord(normalized)) {
        throw new HttpsError('failed-precondition', "That word can't be built from your tiles, or isn't a real word.");
      }

      if (!opponent.secretWord) {
        // Still waiting on the opponent — just lock this word in, don't
        // reveal anything (not even that a word was submitted, beyond a
        // generic log line) and don't swap yet.
        tx.set(handDoc(roomId, uid), { secretWord: normalized }, { merge: true });
        appendLogEntry(tx, roomId, state.logSeq, `${playerName(room, uid)} locked in their Secret Word.`);
        tx.update(stateDoc(roomId), { logSeq: state.logSeq + 1 });
        return { room, turnOrder: state.turnOrder, notifyUid: null };
      }

      // Both words are in — swap tiles-in-front and open play. Random
      // first turn, same convention as Love Letter's startGame.
      const firstTurnUid = state.turnOrder[Math.floor(Math.random() * state.turnOrder.length)];
      tx.set(handDoc(roomId, uid), { secretWord: normalized, tilesInFront: opponent.originalTiles }, { merge: true });
      tx.set(handDoc(roomId, opponentUid), { tilesInFront: own.originalTiles }, { merge: true });
      appendLogEntry(
        tx,
        roomId,
        state.logSeq,
        `Both players locked in their words — tiles swapped! ${playerName(room, firstTurnUid)} goes first.`
      );
      tx.update(stateDoc(roomId), { phase: 'clueOrGuess', turnUid: firstTurnUid, logSeq: state.logSeq + 1 });

      return { room, turnOrder: state.turnOrder, notifyUid: firstTurnUid };
    });

    if (notifyUid) {
      const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
      await sendPushToUid({
        db,
        FieldValue,
        messaging,
        uid: notifyUid,
        notification: { title: "It's your turn!", body: `It's your move in ${gameName} — ${roomLabel(room)}.` },
        link: `${SITE_ORIGIN}/rooms/${roomId}`,
      });
    }

    return { success: true };
  }

  async function activateClue(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, clueId, args = {} } = request.data || {};
    if (!roomId || !clueId) throw new HttpsError('invalid-argument', 'roomId and clueId are required.');

    const { room, notifyUid } = await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap] = await Promise.all([tx.get(roomDoc(roomId)), tx.get(stateDoc(roomId))]);
      if (!roomSnap.exists || !stateSnap.exists) throw new HttpsError('not-found', 'Game state not found.');
      const room = roomSnap.data();
      const state = stateSnap.data();

      if (room.status !== 'active' || state.phase !== 'clueOrGuess') {
        throw new HttpsError('failed-precondition', 'This game is not currently in progress.');
      }
      if (state.turnUid !== uid) throw new HttpsError('permission-denied', "It's not your turn.");
      if (state.pendingClue) throw new HttpsError('failed-precondition', 'A clue response is still pending.');
      if (!state.availableClues.includes(clueId)) {
        throw new HttpsError('failed-precondition', 'That clue is not available.');
      }

      const opponentUid = otherUid(state.turnOrder, uid);
      const availableClues = state.availableClues.filter((id) => id !== clueId); // single-use, confirmed

      // Rhyme Time can't resolve from this call alone — the opponent has
      // to supply a word in the moment. Park it as a pending response and
      // hand the turn to them; they resolve it via respondToRhyme before
      // taking their own real action.
      if (clueId === RHYME_TIME_CLUE_ID) {
        appendLogEntry(
          tx,
          roomId,
          state.logSeq,
          `${playerName(room, uid)} activated Rhyme Time — waiting for ${playerName(room, opponentUid)} to respond.`
        );
        tx.update(stateDoc(roomId), {
          availableClues,
          pendingClue: { clueId, activatorUid: uid, responderUid: opponentUid },
          turnUid: opponentUid,
          logSeq: state.logSeq + 1,
        });
        return { room, notifyUid: opponentUid };
      }

      if ((clueId === 'lets-share' || clueId === 'give-and-take') && state.guessedCorrectly[uid]) {
        throw new HttpsError('failed-precondition', 'This clue is disabled once your word has been correctly guessed.');
      }

      const [callerHandSnap, opponentHandSnap] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        tx.get(handDoc(roomId, opponentUid)),
      ]);
      const callerHand = callerHandSnap.data();
      const opponentHand = opponentHandSnap.data();

      let result;
      try {
        result = resolveClue(clueId, {
          callerUid: uid,
          callerName: playerName(room, uid),
          opponentUid,
          opponentName: playerName(room, opponentUid),
          callerHand,
          opponentHand,
          revealedForCaller: state.revealed[uid] || [],
          revealedForOpponent: state.revealed[opponentUid] || [],
          args,
          pickRandom: (arr) => arr[Math.floor(Math.random() * arr.length)],
        });
      } catch (err) {
        throw new HttpsError('failed-precondition', err.message);
      }

      const tokens = { ...state.tokens, [opponentUid]: (state.tokens[opponentUid] || 0) + result.tokensAwarded };
      const revealed = { ...state.revealed };
      if (result.revealedPatch) {
        for (const [patchUid, positions] of Object.entries(result.revealedPatch)) {
          revealed[patchUid] = [...(revealed[patchUid] || []), ...positions];
        }
      }

      appendLogEntry(tx, roomId, state.logSeq, result.logMessage, {
        kind: 'clue',
        clueId,
        activatorUid: uid,
        aboutUid: opponentUid,
      });

      const outcome = checkAndMaybeCompleteGame({ turnOrder: state.turnOrder, tokens, guessedCorrectly: state.guessedCorrectly });
      if (outcome?.phase === 'completed') {
        completeGame(tx, { roomId, room, turnOrder: state.turnOrder, winnerUid: outcome.winnerUid });
        tx.update(stateDoc(roomId), {
          phase: 'completed',
          winnerUid: outcome.winnerUid,
          tokens,
          revealed,
          availableClues,
          logSeq: state.logSeq + 1,
        });
        return { room, notifyUid: null };
      }
      if (outcome?.phase === 'tiebreaker') {
        tx.update(stateDoc(roomId), { phase: 'tiebreaker', tokens, revealed, availableClues, turnUid: null, logSeq: state.logSeq + 1 });
        return { room, notifyUid: null };
      }

      tx.update(stateDoc(roomId), { tokens, revealed, availableClues, turnUid: opponentUid, logSeq: state.logSeq + 1 });
      return { room, notifyUid: opponentUid };
    });

    if (notifyUid) {
      const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
      await sendPushToUid({
        db,
        FieldValue,
        messaging,
        uid: notifyUid,
        notification: { title: "It's your turn!", body: `It's your move in ${gameName} — ${roomLabel(room)}.` },
        link: `${SITE_ORIGIN}/rooms/${roomId}`,
      });
    }

    return { success: true };
  }

  async function respondToRhyme(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, word } = request.data || {};
    const responseWord = typeof word === 'string' ? word.trim() : '';
    if (!roomId || !responseWord) throw new HttpsError('invalid-argument', 'roomId and word are required.');
    if (responseWord.length > 40) throw new HttpsError('invalid-argument', 'That response is too long.');

    await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap] = await Promise.all([tx.get(roomDoc(roomId)), tx.get(stateDoc(roomId))]);
      if (!roomSnap.exists || !stateSnap.exists) throw new HttpsError('not-found', 'Game state not found.');
      const room = roomSnap.data();
      const state = stateSnap.data();

      if (!state.pendingClue || state.pendingClue.clueId !== RHYME_TIME_CLUE_ID) {
        throw new HttpsError('failed-precondition', 'No Rhyme Time response is pending.');
      }
      if (state.pendingClue.responderUid !== uid) throw new HttpsError('permission-denied', "It's not your turn to respond.");

      const tokens = { ...state.tokens, [uid]: (state.tokens[uid] || 0) + RHYME_TIME_VALUE };
      appendLogEntry(
        tx,
        roomId,
        state.logSeq,
        `${playerName(room, uid)} rhymed with "${responseWord}" for Rhyme Time.`,
        { kind: 'clue', clueId: RHYME_TIME_CLUE_ID, activatorUid: state.pendingClue.activatorUid, aboutUid: uid }
      );

      const outcome = checkAndMaybeCompleteGame({ turnOrder: state.turnOrder, tokens, guessedCorrectly: state.guessedCorrectly });
      if (outcome?.phase === 'completed') {
        completeGame(tx, { roomId, room, turnOrder: state.turnOrder, winnerUid: outcome.winnerUid });
        tx.update(stateDoc(roomId), { phase: 'completed', winnerUid: outcome.winnerUid, tokens, pendingClue: null, logSeq: state.logSeq + 1 });
        return;
      }
      if (outcome?.phase === 'tiebreaker') {
        tx.update(stateDoc(roomId), { phase: 'tiebreaker', tokens, pendingClue: null, turnUid: null, logSeq: state.logSeq + 1 });
        return;
      }

      // Responding doesn't consume a turn — it's a forced step before the
      // responder's real action, so turnUid stays with them (already set
      // when the clue was activated).
      tx.update(stateDoc(roomId), { tokens, pendingClue: null, logSeq: state.logSeq + 1 });
    });

    return { success: true };
  }

  async function guessWord(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, guess } = request.data || {};
    const normalized = normalizeWord(guess);
    if (!roomId || !normalized) throw new HttpsError('invalid-argument', 'roomId and guess are required.');

    const { room, notifyUid } = await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap] = await Promise.all([tx.get(roomDoc(roomId)), tx.get(stateDoc(roomId))]);
      if (!roomSnap.exists || !stateSnap.exists) throw new HttpsError('not-found', 'Game state not found.');
      const room = roomSnap.data();
      const state = stateSnap.data();

      if (room.status !== 'active' || state.phase !== 'clueOrGuess') {
        throw new HttpsError('failed-precondition', 'This game is not currently in progress.');
      }
      if (state.turnUid !== uid) throw new HttpsError('permission-denied', "It's not your turn.");
      if (state.pendingClue) throw new HttpsError('failed-precondition', 'A clue response is still pending.');

      const opponentUid = otherUid(state.turnOrder, uid);
      const [ownSnap, opponentSnap] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        tx.get(handDoc(roomId, opponentUid)),
      ]);
      const own = ownSnap.data();
      const opponent = opponentSnap.data();

      if (!isSpellable(normalized, own.tilesInFront)) {
        throw new HttpsError('failed-precondition', "That guess can't be spelled with the tiles in front of you.");
      }

      const correct = normalized === normalizeWord(opponent.secretWord);

      if (correct) {
        const guessedCorrectly = { ...state.guessedCorrectly, [opponentUid]: true };
        appendLogEntry(tx, roomId, state.logSeq, `${playerName(room, uid)} correctly guessed ${playerName(room, opponentUid)}'s word!`, {
          kind: 'guess',
          guesserUid: uid,
          aboutUid: opponentUid,
          correct: true,
          guess: normalized,
        });

        const outcome = checkAndMaybeCompleteGame({ turnOrder: state.turnOrder, tokens: state.tokens, guessedCorrectly });
        if (outcome?.phase === 'completed') {
          completeGame(tx, { roomId, room, turnOrder: state.turnOrder, winnerUid: outcome.winnerUid });
          tx.update(stateDoc(roomId), { phase: 'completed', winnerUid: outcome.winnerUid, guessedCorrectly, logSeq: state.logSeq + 1 });
          return { room, notifyUid: null };
        }
        if (outcome?.phase === 'tiebreaker') {
          tx.update(stateDoc(roomId), { phase: 'tiebreaker', guessedCorrectly, turnUid: null, logSeq: state.logSeq + 1 });
          return { room, notifyUid: null };
        }
        tx.update(stateDoc(roomId), { guessedCorrectly, turnUid: opponentUid, logSeq: state.logSeq + 1 });
        return { room, notifyUid: opponentUid };
      }

      // Incorrect: guesser's opponent gets +2 tokens; turn ends.
      const tokens = { ...state.tokens, [opponentUid]: (state.tokens[opponentUid] || 0) + WRONG_GUESS_PENALTY };
      appendLogEntry(tx, roomId, state.logSeq, `${playerName(room, uid)} guessed wrong — ${playerName(room, opponentUid)} earns ${WRONG_GUESS_PENALTY} tokens.`, {
        kind: 'guess',
        guesserUid: uid,
        aboutUid: opponentUid,
        correct: false,
        guess: normalized,
      });

      const outcome = checkAndMaybeCompleteGame({ turnOrder: state.turnOrder, tokens, guessedCorrectly: state.guessedCorrectly });
      if (outcome?.phase === 'completed') {
        completeGame(tx, { roomId, room, turnOrder: state.turnOrder, winnerUid: outcome.winnerUid });
        tx.update(stateDoc(roomId), { phase: 'completed', winnerUid: outcome.winnerUid, tokens, logSeq: state.logSeq + 1 });
        return { room, notifyUid: null };
      }
      tx.update(stateDoc(roomId), { tokens, turnUid: opponentUid, logSeq: state.logSeq + 1 });
      return { room, notifyUid: opponentUid };
    });

    if (notifyUid) {
      const gameName = GAME_DISPLAY_NAMES[room.gameType] || 'the game';
      await sendPushToUid({
        db,
        FieldValue,
        messaging,
        uid: notifyUid,
        notification: { title: "It's your turn!", body: `It's your move in ${gameName} — ${roomLabel(room)}.` },
        link: `${SITE_ORIGIN}/rooms/${roomId}`,
      });
    }

    return { success: true };
  }

  async function submitTiebreakerWord(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { roomId, word } = request.data || {};
    const normalized = normalizeWord(word);
    if (!roomId || !normalized) throw new HttpsError('invalid-argument', 'roomId and word are required.');

    await db.runTransaction(async (tx) => {
      const [roomSnap, stateSnap] = await Promise.all([tx.get(roomDoc(roomId)), tx.get(stateDoc(roomId))]);
      if (!roomSnap.exists || !stateSnap.exists) throw new HttpsError('not-found', 'Game state not found.');
      const room = roomSnap.data();
      const state = stateSnap.data();

      const opponentUid = otherUid(state.turnOrder, uid);
      const [ownSnap, opponentSnap] = await Promise.all([
        tx.get(handDoc(roomId, uid)),
        tx.get(handDoc(roomId, opponentUid)),
      ]);
      const own = ownSnap.data();
      const opponent = opponentSnap.data();

      if (state.phase !== 'tiebreaker') {
        // Either not there yet, or someone already won the tiebreaker —
        // this submission simply loses (see file-header note on how
        // first-committer-wins falls out of transaction retry semantics).
        throw new HttpsError('failed-precondition', 'The tiebreaker is not open (it may already be resolved).');
      }
      if (own.tiebreakerWord) throw new HttpsError('failed-precondition', "You've already submitted a tiebreaker word.");
      if (
        normalized.length !== TIEBREAKER_WORD_LENGTH ||
        !isSpellable(normalized, own.originalTiles) ||
        !isValidWord(normalized) ||
        normalized === normalizeWord(own.secretWord) ||
        normalized === normalizeWord(opponent.secretWord)
      ) {
        throw new HttpsError(
          'failed-precondition',
          "That word isn't a new valid 4-letter word from your own original tiles."
        );
      }

      tx.set(handDoc(roomId, uid), { tiebreakerWord: normalized }, { merge: true });

      // First transaction to see phase still 'tiebreaker' wins — a
      // concurrent competing submission that read the same pre-commit
      // state will be transparently retried by Firestore and see
      // phase === 'completed' on its retry, correctly losing.
      completeGame(tx, { roomId, room, turnOrder: state.turnOrder, winnerUid: uid });
      appendLogEntry(tx, roomId, state.logSeq, `${playerName(room, uid)} won the tiebreaker with "${normalized}"!`);
      tx.update(stateDoc(roomId), { phase: 'completed', winnerUid: uid, logSeq: state.logSeq + 1 });
    });

    return { success: true };
  }

  return { dealTiles, submitSecretWord, activateClue, respondToRhyme, guessWord, submitTiebreakerWord };
}
