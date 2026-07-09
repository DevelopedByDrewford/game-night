import { describe, it, expect, vi } from 'vitest';
import { createWordyHandlers } from '../lib/wordyHandlers.js';
import { createFakeFirestore, fakeFieldValue } from './fakeFirestore.js';

// Orchestration tests for wordyHandlers.js — wordyRules.js's per-clue effect
// logic is already exhaustively unit-tested (wordyRules.test.js); this file
// exists to catch wiring bugs (wrong doc paths, transaction read/write
// ordering, turn/phase transitions, the tile swap, win detection) the same
// way playCard.integration.test.js does for Love Letter.

function makeRoom({ roomId, hostUid, playerUids }) {
  return {
    id: roomId,
    gameType: 'a-little-wordy',
    code: 'TEST',
    hostUid,
    status: 'waiting',
    playerUids,
    players: playerUids.map((uid, seat) => ({ uid, displayName: uid, seat })),
    settings: { playerCount: playerUids.length, autoSkipEnabled: false },
  };
}

function makeFakeMessaging() {
  return { sendEachForMulticast: vi.fn().mockResolvedValue({ responses: [] }) };
}

// Deterministic hands (bypassing dealTiles's random draw) so tests can
// control exactly which words are spellable: Alice's letters spell CAB,
// Bob's spell DOG. availableClues is likewise pinned to a known set so
// tests don't depend on which 8 of 16 clues randomly made the pool.
async function setupSwappedGame() {
  const { db, getDoc, setDoc, getCollection } = createFakeFirestore();
  const messaging = makeFakeMessaging();
  const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging });
  const roomId = 'room1';
  const uidA = 'alice';
  const uidB = 'bob';

  setDoc(`gameRooms/${roomId}`, makeRoom({ roomId, hostUid: uidA, playerUids: [uidA, uidB] }));
  await handlers.dealTiles({ auth: { uid: uidA }, data: { roomId } });

  setDoc(`gameRooms/${roomId}/hands/${uidA}`, {
    originalTiles: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
    tilesInFront: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
    secretWord: null,
    tiebreakerWord: null,
  });
  setDoc(`gameRooms/${roomId}/hands/${uidB}`, {
    originalTiles: { vowels: ['A', 'E', 'I', 'O'], consonants: ['D', 'G', 'L', 'N', 'P', 'R', 'S'] },
    tilesInFront: { vowels: ['A', 'E', 'I', 'O'], consonants: ['D', 'G', 'L', 'N', 'P', 'R', 'S'] },
    secretWord: null,
    tiebreakerWord: null,
  });

  const state0 = getDoc(`gameRooms/${roomId}/state/current`);
  setDoc(`gameRooms/${roomId}/state/current`, {
    ...state0,
    availableClues: [
      'exact-word-length',
      'last-letter',
      'first-letter',
      'letter-strike',
      'vowel-count',
      'consonant-count',
      'lets-share',
      'rhyme-time',
    ],
  });

  await handlers.submitSecretWord({ auth: { uid: uidA }, data: { roomId, word: 'cab' } });
  await handlers.submitSecretWord({ auth: { uid: uidB }, data: { roomId, word: 'dog' } });

  return { db, getDoc, setDoc, getCollection, handlers, roomId, uidA, uidB, messaging };
}

// Once swapped, a player's tilesInFront equals their opponent's
// originalTiles. Returns a word that's spellable from that set but isn't
// the opponent's actual secret word — for exercising the "wrong guess" path.
function wrongSpellableGuessFor(uid, uidA) {
  return uid === uidA ? 'LAP' : 'BAD';
}

describe('dealTiles', () => {
  it('deals tiles, opens word submission, and notifies both players', async () => {
    const { db, getDoc, setDoc, getCollection } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging });
    const roomId = 'room1';
    setDoc(`gameRooms/${roomId}`, makeRoom({ roomId, hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.dealTiles({ auth: { uid: 'alice' }, data: { roomId } });

    const room = getDoc(`gameRooms/${roomId}`);
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(room.status).toBe('active');
    expect(state.phase).toBe('wordSubmission');
    expect(state.availableClues).toHaveLength(8);

    const aliceHand = getDoc(`gameRooms/${roomId}/hands/alice`);
    expect(aliceHand.tilesInFront).toEqual(aliceHand.originalTiles);
    expect(aliceHand.originalTiles.vowels).toHaveLength(4);
    expect(aliceHand.originalTiles.consonants).toHaveLength(7);

    expect(getCollection('users/alice/activity').some((a) => a.type === 'game_started')).toBe(true);
    expect(getCollection('users/bob/activity').some((a) => a.type === 'game_started')).toBe(true);
  });

  it('rejects a non-host caller', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ roomId: 'room1', hostUid: 'alice', playerUids: ['alice', 'bob'] }));
    await expect(handlers.dealTiles({ auth: { uid: 'bob' }, data: { roomId: 'room1' } })).rejects.toThrow();
  });

  it('rejects a room without exactly 2 players', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ roomId: 'room1', hostUid: 'alice', playerUids: ['alice'] }));
    await expect(handlers.dealTiles({ auth: { uid: 'alice' }, data: { roomId: 'room1' } })).rejects.toThrow();
  });
});

describe('submitSecretWord', () => {
  it('rejects a word not spellable from originalTiles', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ roomId: 'room1', hostUid: 'alice', playerUids: ['alice', 'bob'] }));
    await handlers.dealTiles({ auth: { uid: 'alice' }, data: { roomId: 'room1' } });
    setDoc('gameRooms/room1/hands/alice', {
      originalTiles: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
      tilesInFront: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
      secretWord: null,
      tiebreakerWord: null,
    });

    await expect(
      handlers.submitSecretWord({ auth: { uid: 'alice' }, data: { roomId: 'room1', word: 'zephyr' } })
    ).rejects.toThrow();
  });

  it('locks the first word without swapping, then swaps tiles and opens play once both submit', async () => {
    const { getDoc, roomId, uidA, uidB } = await setupSwappedGame();
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.phase).toBe('clueOrGuess');
    expect(state.turnOrder).toContain(state.turnUid);

    const aHand = getDoc(`gameRooms/${roomId}/hands/${uidA}`);
    const bHand = getDoc(`gameRooms/${roomId}/hands/${uidB}`);
    expect(aHand.secretWord).toBe('CAB');
    expect(bHand.secretWord).toBe('DOG');
    // post-swap: each player's tilesInFront is the OTHER player's originalTiles
    expect(aHand.tilesInFront).toEqual(bHand.originalTiles);
    expect(bHand.tilesInFront).toEqual(aHand.originalTiles);
  });
});

describe('activateClue + guessWord turn cycle', () => {
  it('awards tokens to the opponent, advances turns, and only declares a winner once strictly ahead', async () => {
    const { getDoc, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const turn1 = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const turn2 = turn1 === uidA ? uidB : uidA;

    // exact-word-length: both secret words are 3 letters, value 3 — awarded
    // to whoever is NOT activating.
    await handlers.activateClue({ auth: { uid: turn1 }, data: { roomId, clueId: 'exact-word-length' } });
    let state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.tokens[turn2]).toBe(3);
    expect(state.tokens[turn1]).toBe(0);
    expect(state.turnUid).toBe(turn2);
    expect(state.availableClues).not.toContain('exact-word-length');

    // last-letter: value 1, awarded to turn1 this time.
    await handlers.activateClue({ auth: { uid: turn2 }, data: { roomId, clueId: 'last-letter' } });
    state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.tokens[turn1]).toBe(1);
    expect(state.turnUid).toBe(turn1);

    // turn1 correctly guesses turn2's word, but is behind on tokens (1 < 3)
    // — guessing correctly alone shouldn't end the game.
    const turn2Word = getDoc(`gameRooms/${roomId}/hands/${turn2}`).secretWord;
    await handlers.guessWord({ auth: { uid: turn1 }, data: { roomId, guess: turn2Word } });
    state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.guessedCorrectly[turn2]).toBe(true);
    expect(state.phase).toBe('clueOrGuess');
    expect(state.turnUid).toBe(turn2);

    // turn2 then correctly guesses turn1's word — turn2 is strictly ahead
    // (3 > 1) at the moment their opponent's word is confirmed guessed, so
    // this should end the game with turn2 as winner.
    const turn1Word = getDoc(`gameRooms/${roomId}/hands/${turn1}`).secretWord;
    await handlers.guessWord({ auth: { uid: turn2 }, data: { roomId, guess: turn1Word } });
    state = getDoc(`gameRooms/${roomId}/state/current`);
    const room = getDoc(`gameRooms/${roomId}`);
    expect(state.phase).toBe('completed');
    expect(state.winnerUid).toBe(turn2);
    expect(room.status).toBe('completed');

    const winnerStats = getDoc(`users/${turn2}`).stats['a-little-wordy'];
    expect(winnerStats.wins).toBe(1);
    expect(winnerStats.gamesPlayed).toBe(1);
    const loserStats = getDoc(`users/${turn1}`).stats['a-little-wordy'];
    expect(loserStats.wins).toBe(0);
    expect(loserStats.gamesPlayed).toBe(1);
  });

  it('an incorrect guess penalizes the opponent by 2 tokens and passes the turn without revealing the word', async () => {
    const { getDoc, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const turn1 = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const turn2 = turn1 === uidA ? uidB : uidA;

    await handlers.guessWord({
      auth: { uid: turn1 },
      data: { roomId, guess: wrongSpellableGuessFor(turn1, uidA) },
    });
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.tokens[turn2]).toBe(2);
    expect(state.tokens[turn1]).toBe(0);
    expect(state.guessedCorrectly[turn1]).toBe(false);
    expect(state.guessedCorrectly[turn2]).toBe(false);
    expect(state.turnUid).toBe(turn2);
    expect(state.phase).toBe('clueOrGuess');
  });

  it('tags clue and guess log entries with structured metadata for the frontend clues record', async () => {
    const { getDoc, getCollection, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const turn1 = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const turn2 = turn1 === uidA ? uidB : uidA;

    await handlers.activateClue({ auth: { uid: turn1 }, data: { roomId, clueId: 'exact-word-length' } });
    await handlers.guessWord({
      auth: { uid: turn2 },
      data: { roomId, guess: wrongSpellableGuessFor(turn2, uidA) },
    });

    const entries = getCollection(`gameRooms/${roomId}/log`);
    const clueEntry = entries.find((e) => e.kind === 'clue');
    expect(clueEntry).toMatchObject({ clueId: 'exact-word-length', activatorUid: turn1, aboutUid: turn2 });

    const guessEntry = entries.find((e) => e.kind === 'guess');
    expect(guessEntry).toMatchObject({
      guesserUid: turn2,
      aboutUid: turn1,
      correct: false,
      guess: wrongSpellableGuessFor(turn2, uidA),
    });

    // Entries with no game-meaning kind (dealt/locked-in/swap) stay
    // unstructured — CluesRecord should skip them entirely.
    expect(entries.some((e) => e.kind === undefined)).toBe(true);
  });

  it('tags a resolved Rhyme Time response with the original activator as activatorUid', async () => {
    const { getDoc, getCollection, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const activator = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const responder = activator === uidA ? uidB : uidA;

    await handlers.activateClue({ auth: { uid: activator }, data: { roomId, clueId: 'rhyme-time' } });
    await handlers.respondToRhyme({ auth: { uid: responder }, data: { roomId, word: 'blab' } });

    const entries = getCollection(`gameRooms/${roomId}/log`);
    const rhymeEntry = entries.find((e) => e.kind === 'clue' && e.clueId === 'rhyme-time');
    expect(rhymeEntry).toMatchObject({ activatorUid: activator, aboutUid: responder });
  });

  it('rejects a guess that cannot be spelled from the tiles in front of the guesser', async () => {
    const { getDoc, handlers, roomId } = await setupSwappedGame();
    const turn1 = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    await expect(
      handlers.guessWord({ auth: { uid: turn1 }, data: { roomId, guess: 'zephyrs' } })
    ).rejects.toThrow();
  });

  it('rejects activating a clue that is not the caller\'s turn or not in the pool', async () => {
    const { getDoc, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const turn1 = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const turn2 = turn1 === uidA ? uidB : uidA;

    await expect(
      handlers.activateClue({ auth: { uid: turn2 }, data: { roomId, clueId: 'last-letter' } })
    ).rejects.toThrow();
    await expect(
      handlers.activateClue({ auth: { uid: turn1 }, data: { roomId, clueId: 'buy-a-vowel' } }) // not in the pinned pool
    ).rejects.toThrow();
  });
});

describe('Rhyme Time (pending clue two-step)', () => {
  it('parks a pending response, blocks other actions, and resolves without consuming the responder\'s turn', async () => {
    const { getDoc, handlers, roomId, uidA, uidB } = await setupSwappedGame();
    const activator = getDoc(`gameRooms/${roomId}/state/current`).turnUid;
    const responder = activator === uidA ? uidB : uidA;

    await handlers.activateClue({ auth: { uid: activator }, data: { roomId, clueId: 'rhyme-time' } });
    let state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.pendingClue).toEqual({ clueId: 'rhyme-time', activatorUid: activator, responderUid: responder });
    expect(state.turnUid).toBe(responder);
    expect(state.availableClues).not.toContain('rhyme-time');

    // Blocked while a response is pending, for either player.
    await expect(
      handlers.activateClue({ auth: { uid: responder }, data: { roomId, clueId: 'last-letter' } })
    ).rejects.toThrow();
    await expect(
      handlers.guessWord({ auth: { uid: responder }, data: { roomId, guess: 'anything' } })
    ).rejects.toThrow();
    // Only the designated responder may resolve it.
    await expect(
      handlers.respondToRhyme({ auth: { uid: activator }, data: { roomId, word: 'jabber' } })
    ).rejects.toThrow();

    await handlers.respondToRhyme({ auth: { uid: responder }, data: { roomId, word: 'blab' } });
    state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.pendingClue).toBeNull();
    expect(state.tokens[responder]).toBe(5);
    // Resolving doesn't consume a turn — it's still the responder's turn
    // for their real action.
    expect(state.turnUid).toBe(responder);

    await handlers.activateClue({ auth: { uid: responder }, data: { roomId, clueId: 'last-letter' } });
    state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.turnUid).toBe(activator);
  });
});

describe('submitTiebreakerWord', () => {
  it('the first valid submission wins the game; a later submission is rejected', async () => {
    const { db, getDoc, setDoc, roomId, uidA, uidB } = await setupSwappedGame();
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    setDoc(`gameRooms/${roomId}/state/current`, {
      ...state,
      phase: 'tiebreaker',
      turnUid: null,
      tokens: { [uidA]: 4, [uidB]: 4 },
      guessedCorrectly: { [uidA]: true, [uidB]: true },
    });
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });

    await handlers.submitTiebreakerWord({ auth: { uid: uidA }, data: { roomId, word: 'fade' } });
    const afterA = getDoc(`gameRooms/${roomId}/state/current`);
    expect(afterA.phase).toBe('completed');
    expect(afterA.winnerUid).toBe(uidA);
    expect(getDoc(`gameRooms/${roomId}`).status).toBe('completed');

    await expect(
      handlers.submitTiebreakerWord({ auth: { uid: uidB }, data: { roomId, word: 'grid' } })
    ).rejects.toThrow();
  });

  it('rejects a tiebreaker word already used as a secret word this game', async () => {
    const { getDoc, setDoc, db, roomId, uidA } = await setupSwappedGame();
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    setDoc(`gameRooms/${roomId}/state/current`, {
      ...state,
      phase: 'tiebreaker',
      tokens: { [state.turnOrder[0]]: 4, [state.turnOrder[1]]: 4 },
      guessedCorrectly: { [state.turnOrder[0]]: true, [state.turnOrder[1]]: true },
    });
    const handlers = createWordyHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });

    await expect(
      handlers.submitTiebreakerWord({ auth: { uid: uidA }, data: { roomId, word: 'cab' } }) // uidA's own secretWord
    ).rejects.toThrow();
  });
});
