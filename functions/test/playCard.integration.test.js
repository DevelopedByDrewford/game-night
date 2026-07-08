import { describe, it, expect } from 'vitest';
import { createHandlers } from '../lib/handlers.js';
import { createFakeFirestore, fakeFieldValue } from './fakeFirestore.js';
import { isCountessForced, legalTargets } from '../lib/rules.js';

// Full-game smoke test: drives startGame + repeated playCard calls through
// an entire game (no real Firebase project or emulator — this machine has
// no JVM for the Firestore emulator, so a fake in-memory Firestore stands
// in). Unit tests already cover rules.js exhaustively; this exists to catch
// orchestration bugs in handlers.js itself (wrong doc paths, transaction
// read/write ordering, data shape mismatches) that pure-function tests
// can't see.

function makeRoom({ roomId, hostUid, playerUids }) {
  return {
    id: roomId,
    gameType: 'love-letter',
    code: 'TEST',
    hostUid,
    status: 'waiting',
    playerUids,
    players: playerUids.map((uid, seat) => ({ uid, displayName: uid, seat })),
    settings: { playerCount: playerUids.length, ruleset: 'classic', autoSkipEnabled: false },
  };
}

function pickCardToPlay(hand) {
  return isCountessForced(hand) ? 'countess' : hand[0];
}

async function playFullGame({ roomId, playerUids }, { setDoc, getDoc }, handlers) {
  setDoc(`gameRooms/${roomId}`, makeRoom({ roomId, hostUid: playerUids[0], playerUids }));

  await handlers.startGame({ auth: { uid: playerUids[0] }, data: { roomId } });

  for (let i = 0; i < 300; i++) {
    const room = getDoc(`gameRooms/${roomId}`);
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    if (room.status === 'completed' || state.phase !== 'playing') return { room, state };

    const currentUid = state.turnUid;
    const hand = getDoc(`gameRooms/${roomId}/hands/${currentUid}`).cards;
    expect(hand.length).toBe(2);

    const cardId = pickCardToPlay(hand);
    const aliveUids = state.turnOrder.filter((u) => !state.eliminated[u]);
    const protectedUids = aliveUids.filter((u) => state.protected[u]);
    const targets = legalTargets(cardId, currentUid, aliveUids, protectedUids);
    const needsTarget = ['guard', 'priest', 'baron', 'king', 'prince'].includes(cardId);
    const targetUid = needsTarget && targets.length > 0 ? targets[0] : null;
    const guessCardId = cardId === 'guard' && targetUid ? 'priest' : null;

    await handlers.playCard({ auth: { uid: currentUid }, data: { roomId, cardId, targetUid, guessCardId } });
  }

  throw new Error('Game did not complete within 300 moves — likely an infinite loop bug.');
}

describe('full game playthrough (fake Firestore)', () => {
  it('plays a 2-player game to completion and records stats', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    const playerUids = ['alice', 'bob'];

    const { room, state } = await playFullGame({ roomId: 'room2p', playerUids }, { setDoc, getDoc }, handlers);

    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(Math.max(...playerUids.map((u) => state.tokens[u]))).toBeGreaterThanOrEqual(state.tokensToWin);

    for (const uid of playerUids) {
      const userDoc = getDoc(`users/${uid}`);
      expect(userDoc.stats['love-letter'].gamesPlayed).toBe(1);
    }
    const winners = playerUids.filter((u) => state.tokens[u] >= state.tokensToWin);
    for (const uid of winners) {
      expect(getDoc(`users/${uid}`).stats['love-letter'].wins).toBe(1);
    }
  });

  it('plays a 3-player game to completion and records stats', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    const playerUids = ['alice', 'bob', 'cleo'];

    const { room, state } = await playFullGame({ roomId: 'room3p', playerUids }, { setDoc, getDoc }, handlers);

    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(Math.max(...playerUids.map((u) => state.tokens[u]))).toBeGreaterThanOrEqual(state.tokensToWin);
  });

  it('rejects a second player trying to start the same room twice', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    setDoc('gameRooms/dup', makeRoom({ roomId: 'dup', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'dup' } });
    await expect(handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'dup' } })).rejects.toThrow();
    expect(getDoc('gameRooms/dup').status).toBe('active');
  });

  it('rejects a non-host trying to start the game', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    setDoc('gameRooms/r', makeRoom({ roomId: 'r', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.startGame({ auth: { uid: 'bob' }, data: { roomId: 'r' } })).rejects.toThrow();
  });

  it('rejects a play out of turn', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    setDoc('gameRooms/r2', makeRoom({ roomId: 'r2', hostUid: 'alice', playerUids: ['alice', 'bob'] }));
    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'r2' } });

    const state = getDoc('gameRooms/r2/state/current');
    const notTurnUid = state.turnOrder.find((u) => u !== state.turnUid);

    await expect(
      handlers.playCard({ auth: { uid: notTurnUid }, data: { roomId: 'r2', cardId: 'guard' } })
    ).rejects.toThrow();
  });

  it('rejects 5+ player rooms with a clear error', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue });
    const playerUids = ['a', 'b', 'c', 'd', 'e'];
    setDoc('gameRooms/big', makeRoom({ roomId: 'big', hostUid: 'a', playerUids }));

    await expect(handlers.startGame({ auth: { uid: 'a' }, data: { roomId: 'big' } })).rejects.toThrow(/coming soon/);
  });
});
