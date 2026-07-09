import { describe, it, expect, vi } from 'vitest';
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

function makeRoom({ roomId, hostUid, playerUids, ruleset = 'classic' }) {
  return {
    id: roomId,
    gameType: 'love-letter',
    code: 'TEST',
    hostUid,
    status: 'waiting',
    playerUids,
    players: playerUids.map((uid, seat) => ({ uid, displayName: uid, seat })),
    settings: { playerCount: playerUids.length, ruleset, autoSkipEnabled: false },
  };
}

// Default: no tokens registered anywhere, so sendTurnNotification no-ops
// (tokens.length === 0) for every test that isn't specifically about
// notifications — keeps the existing game-logic tests unaffected.
function makeFakeMessaging() {
  return { sendEachForMulticast: vi.fn().mockResolvedValue({ responses: [] }) };
}

function pickCardToPlay(hand) {
  return isCountessForced(hand) ? 'countess' : hand[0];
}

async function playFullGame({ roomId, playerUids, ruleset = 'classic' }, { setDoc, getDoc }, handlers) {
  setDoc(`gameRooms/${roomId}`, makeRoom({ roomId, hostUid: playerUids[0], playerUids, ruleset }));

  await handlers.startGame({ auth: { uid: playerUids[0] }, data: { roomId } });

  for (let i = 0; i < 300; i++) {
    const room = getDoc(`gameRooms/${roomId}`);
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    if (room.status === 'completed') return { room, state };

    if (state.phase === 'chancellorPending') {
      const hand = getDoc(`gameRooms/${roomId}/hands/${state.turnUid}`).cards;
      await handlers.resolveChancellor({
        auth: { uid: state.turnUid },
        data: { roomId, keepCardId: hand[0] },
      });
      continue;
    }

    if (state.phase !== 'playing') return { room, state };

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
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
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
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['alice', 'bob', 'cleo'];

    const { room, state } = await playFullGame({ roomId: 'room3p', playerUids }, { setDoc, getDoc }, handlers);

    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(Math.max(...playerUids.map((u) => state.tokens[u]))).toBeGreaterThanOrEqual(state.tokensToWin);
  });

  it('rejects a second player trying to start the same room twice', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/dup', makeRoom({ roomId: 'dup', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'dup' } });
    await expect(handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'dup' } })).rejects.toThrow();
    expect(getDoc('gameRooms/dup').status).toBe('active');
  });

  it('rejects a non-host trying to start the game', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/r', makeRoom({ roomId: 'r', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.startGame({ auth: { uid: 'bob' }, data: { roomId: 'r' } })).rejects.toThrow();
  });

  it('rejects a play out of turn', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/r2', makeRoom({ roomId: 'r2', hostUid: 'alice', playerUids: ['alice', 'bob'] }));
    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'r2' } });

    const state = getDoc('gameRooms/r2/state/current');
    const notTurnUid = state.turnOrder.find((u) => u !== state.turnUid);

    await expect(
      handlers.playCard({ auth: { uid: notTurnUid }, data: { roomId: 'r2', cardId: 'guard' } })
    ).rejects.toThrow();
  });

  it('rejects 7+ player rooms with a clear error', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    setDoc('gameRooms/big', makeRoom({ roomId: 'big', hostUid: 'a', playerUids }));

    await expect(handlers.startGame({ auth: { uid: 'a' }, data: { roomId: 'big' } })).rejects.toThrow(/coming soon/);
  });

  it('accepts a 5-player room, auto-upgrading an invalid stored ruleset to extended', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['a', 'b', 'c', 'd', 'e'];
    // ruleset defaults to 'classic' via makeRoom, which is invalid for 5 —
    // startGame should fall back to 'extended' rather than reject.
    setDoc('gameRooms/five', makeRoom({ roomId: 'five', hostUid: 'a', playerUids }));

    await handlers.startGame({ auth: { uid: 'a' }, data: { roomId: 'five' } });
    expect(getDoc('gameRooms/five/state/current').ruleset).toBe('extended');
  });

  it('plays a 5-player extended-deck game to completion and records stats', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['a', 'b', 'c', 'd', 'e'];

    const { room, state } = await playFullGame(
      { roomId: 'room5p', playerUids, ruleset: 'extended' },
      { setDoc, getDoc },
      handlers
    );

    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(Math.max(...playerUids.map((u) => state.tokens[u]))).toBeGreaterThanOrEqual(state.tokensToWin);
  });

  it('plays a 6-player extended-deck game to completion', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['a', 'b', 'c', 'd', 'e', 'f'];

    const { room, state } = await playFullGame(
      { roomId: 'room6p', playerUids, ruleset: 'extended' },
      { setDoc, getDoc },
      handlers
    );

    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
  });

  it('resolves a Chancellor play: draws 2, keeps 1, returns the rest to the bottom, and advances the turn', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['alice', 'bob'];
    setDoc('gameRooms/chan', makeRoom({ roomId: 'chan', hostUid: 'alice', playerUids, ruleset: 'extended' }));
    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'chan' } });

    // Force the deal so the first player definitely holds a Chancellor.
    const firstUid = getDoc('gameRooms/chan/state/current').turnUid;
    setDoc(`gameRooms/chan/hands/${firstUid}`, { cards: ['chancellor', 'guard'] });
    const drawPileBefore = getDoc('gameRooms/chan/secret/deck').drawPile;

    await handlers.playCard({ auth: { uid: firstUid }, data: { roomId: 'chan', cardId: 'chancellor' } });

    const pending = getDoc('gameRooms/chan/state/current');
    expect(pending.phase).toBe('chancellorPending');
    expect(pending.turnUid).toBe(firstUid);
    expect(getDoc(`gameRooms/chan/hands/${firstUid}`).cards).toHaveLength(3);
    expect(getDoc('gameRooms/chan/secret/deck').drawPile).toHaveLength(drawPileBefore.length - 2);

    // A second playCard call must be rejected while a decision is pending.
    await expect(
      handlers.playCard({ auth: { uid: firstUid }, data: { roomId: 'chan', cardId: 'guard' } })
    ).rejects.toThrow();

    await handlers.resolveChancellor({ auth: { uid: firstUid }, data: { roomId: 'chan', keepCardId: 'guard' } });

    const after = getDoc('gameRooms/chan/state/current');
    expect(after.phase).toBe('playing');
    expect(after.turnUid).not.toBe(firstUid);
    expect(getDoc(`gameRooms/chan/hands/${firstUid}`).cards).toEqual(['guard']);
    // Net-neutral across the two calls: drew 2 for Chancellor, returned 2 to
    // the bottom, then dealt exactly 1 card to the next player to end the turn.
    expect(getDoc('gameRooms/chan/secret/deck').drawPile).toHaveLength(drawPileBefore.length - 1);
  });
});

describe('turn notifications', () => {
  it('notifies the first player when startGame deals to them', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { pushTokens: ['tok-alice'] });
    setDoc('users/bob', { pushTokens: ['tok-bob'] });
    setDoc('gameRooms/notif1', makeRoom({ roomId: 'notif1', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'notif1' } });

    const firstUid = getDoc('gameRooms/notif1/state/current').turnUid;
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual([`tok-${firstUid}`]);
    expect(messaging.sendEachForMulticast.mock.calls[0][0].notification).toEqual({
      title: "It's your turn!",
      body: "It's your move in Love Letter — Room TEST.",
    });
  });

  it('does not send anything when the player has no registered token', async () => {
    const { db, setDoc } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('gameRooms/notif2', makeRoom({ roomId: 'notif2', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'notif2' } });

    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('notifies the new turn owner when playCard passes the turn to them', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { pushTokens: ['tok-alice'] });
    setDoc('users/bob', { pushTokens: ['tok-bob'] });
    setDoc('gameRooms/notif3', makeRoom({ roomId: 'notif3', hostUid: 'alice', playerUids: ['alice', 'bob'] }));
    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'notif3' } });

    const currentUid = getDoc('gameRooms/notif3/state/current').turnUid;
    const otherUid = currentUid === 'alice' ? 'bob' : 'alice';
    // Force an untargeted card (Handmaid) so the turn passes deterministically.
    setDoc(`gameRooms/notif3/hands/${currentUid}`, { cards: ['handmaid', 'guard'] });
    messaging.sendEachForMulticast.mockClear();

    await handlers.playCard({
      auth: { uid: currentUid },
      data: { roomId: 'notif3', cardId: 'handmaid', targetUid: null, guessCardId: null },
    });

    expect(getDoc('gameRooms/notif3/state/current').turnUid).toBe(otherUid);
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual([`tok-${otherUid}`]);
  });

  it('does not notify anyone while a Chancellor decision is pending (same player continues)', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const messaging = makeFakeMessaging();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { pushTokens: ['tok-alice'] });
    setDoc('users/bob', { pushTokens: ['tok-bob'] });
    setDoc('gameRooms/notif4', makeRoom({ roomId: 'notif4', hostUid: 'alice', playerUids: ['alice', 'bob'], ruleset: 'extended' }));
    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'notif4' } });

    const firstUid = getDoc('gameRooms/notif4/state/current').turnUid;
    setDoc(`gameRooms/notif4/hands/${firstUid}`, { cards: ['chancellor', 'guard'] });
    messaging.sendEachForMulticast.mockClear();

    await handlers.playCard({ auth: { uid: firstUid }, data: { roomId: 'notif4', cardId: 'chancellor' } });

    expect(getDoc('gameRooms/notif4/state/current').phase).toBe('chancellorPending');
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('removes a token FCM reports as unregistered', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const messaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }],
      }),
    };
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging });
    setDoc('users/alice', { pushTokens: ['bad-token-alice'] });
    setDoc('users/bob', { pushTokens: ['bad-token-bob'] });
    setDoc('gameRooms/notif5', makeRoom({ roomId: 'notif5', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await handlers.startGame({ auth: { uid: 'alice' }, data: { roomId: 'notif5' } });

    const firstUid = getDoc('gameRooms/notif5/state/current').turnUid;
    expect(getDoc(`users/${firstUid}`).pushTokens).toEqual([]);
  });
});
