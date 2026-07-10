import { describe, it, expect, vi } from 'vitest';
import { createHandlers } from '../lib/sideEffectsHandlers.js';
import { createFakeFirestore, fakeFieldValue } from './fakeFirestore.js';
import { CARD_DEFS } from '../lib/sideEffectsDeck.js';

// Same purpose as playCard.integration.test.js: unit tests (sideEffectsRules.
// test.js) already cover the pure rules engine exhaustively — this exists to
// catch orchestration bugs in sideEffectsHandlers.js (wrong doc paths,
// transaction read/write ordering, data shape mismatches) that pure-function
// tests can't see, via the same in-memory fake Firestore.

function makeRoom({ roomId, hostUid, playerUids, ruleset = 'base' }) {
  return {
    id: roomId,
    gameType: 'side-effects',
    code: 'TEST',
    hostUid,
    status: 'waiting',
    playerUids,
    players: playerUids.map((uid, seat) => ({ uid, displayName: uid, seat })),
    settings: { playerCount: playerUids.length, ruleset },
  };
}

function makeFakeMessaging() {
  return { sendEachForMulticast: vi.fn().mockResolvedValue({ responses: [] }) };
}

describe('dealPsyches (orchestration)', () => {
  it('deals a valid game start: psyches, hands, draw pile, room status', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['alice', 'bob'];
    setDoc('gameRooms/room1', makeRoom({ roomId: 'room1', hostUid: 'alice', playerUids }));

    await handlers.dealPsyches({ auth: { uid: 'alice' }, data: { roomId: 'room1' } });

    const room = getDoc('gameRooms/room1');
    const state = getDoc('gameRooms/room1/state/current');
    expect(room.status).toBe('active');
    expect(state.phase).toBe('playing');
    expect(state.turnOrder).toEqual(playerUids);
    expect(playerUids).toContain(state.turnUid);

    for (const uid of playerUids) {
      const psyche = state.psyches[uid];
      expect(psyche).toHaveLength(4); // < 6 players
      expect(new Set(psyche.map((e) => e.disorderId)).size).toBe(4); // no duplicates
      for (const entry of psyche) {
        expect(entry.drugId).toBeNull();
        expect(entry.episodeActive).toBeNull();
      }
      const hand = getDoc(`gameRooms/room1/hands/${uid}`).cards;
      expect(hand).toHaveLength(4);
    }

    const secret = getDoc('gameRooms/room1/secret/deck');
    expect(secret.discardPile).toEqual([]);
    expect(secret.drawPile.length).toBe(state.deckCount);
  });

  it('deals only 3 psyche disorders at 6+ players', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['a', 'b', 'c', 'd', 'e', 'f'];
    setDoc('gameRooms/room6', makeRoom({ roomId: 'room6', hostUid: 'a', playerUids }));

    await handlers.dealPsyches({ auth: { uid: 'a' }, data: { roomId: 'room6' } });

    const state = getDoc('gameRooms/room6/state/current');
    for (const uid of playerUids) {
      expect(state.psyches[uid]).toHaveLength(3);
    }
  });

  it('rejects a non-host caller', async () => {
    const { db, setDoc } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    setDoc('gameRooms/room1', makeRoom({ roomId: 'room1', hostUid: 'alice', playerUids: ['alice', 'bob'] }));

    await expect(handlers.dealPsyches({ auth: { uid: 'bob' }, data: { roomId: 'room1' } })).rejects.toThrow();
  });
});

describe('playAction (orchestration)', () => {
  function seedGame({ roomId = 'room1', playerUids = ['alice', 'bob'], psyches, hands, ruleset = 'base', restrictions } = {}) {
    const { db, getDoc, setDoc, getCollection } = createFakeFirestore();
    setDoc(`gameRooms/${roomId}`, { ...makeRoom({ roomId, hostUid: playerUids[0], playerUids, ruleset }), status: 'active' });
    setDoc(`gameRooms/${roomId}/state/current`, {
      ruleset,
      turnOrder: playerUids,
      turnUid: playerUids[0],
      turnNumber: 1,
      movesThisTurn: 0,
      deckCount: 10,
      discardCount: 0,
      psyches,
      restrictions: restrictions || Object.fromEntries(playerUids.map((u) => [u, {}])),
      phase: 'playing',
      winnerUid: null,
      logSeq: 0,
    });
    for (const [uid, cards] of Object.entries(hands)) {
      setDoc(`gameRooms/${roomId}/hands/${uid}`, { cards });
    }
    setDoc(`gameRooms/${roomId}/secret/deck`, { drawPile: ['therapy', 'episode'], discardPile: [] });
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    return { handlers, getDoc, setDoc, getCollection, roomId };
  }

  it('treat: sets drugId, removes the drug from hand, advances movesThisTurn', async () => {
    // Two psyche entries so treating one doesn't also complete/win the game
    // — that scenario is covered by its own test below.
    const { handlers, getDoc, roomId } = seedGame({
      psyches: {
        alice: [
          { disorderId: 'anxiety', drugId: null, episodeActive: null },
          { disorderId: 'madness', drugId: null, episodeActive: null },
        ],
        bob: [],
      },
      hands: { alice: ['anxietyTreatment'], bob: [] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' },
    });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.psyches.alice[0].drugId).toBe('anxietyTreatment');
    expect(state.movesThisTurn).toBe(1);
    expect(getDoc(`gameRooms/${roomId}/hands/alice`).cards).toEqual([]);
  });

  it('treat: completing the whole psyche ends the game and records stats/activity', async () => {
    const { handlers, getDoc, getCollection, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'anxiety', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['anxietyTreatment'], bob: [] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' },
    });

    const room = getDoc(`gameRooms/${roomId}`);
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(state.winnerUid).toBe('alice');
    expect(getDoc('users/alice').stats['side-effects']).toEqual({ gamesPlayed: 1, wins: 1 });
    expect(getDoc('users/bob').stats['side-effects']).toEqual({ gamesPlayed: 1, wins: 0 });
    const aliceActivity = getCollection('users/alice/activity');
    expect(aliceActivity.map((a) => a.type)).toEqual(['game_won']);
    const bobActivity = getCollection('users/bob/activity');
    expect(bobActivity.map((a) => a.type)).toEqual(['game_lost']);
  });

  it('giveDisorder: adds an untreated disorder to a vulnerable target psyche', async () => {
    const { handlers, getDoc, roomId } = seedGame({
      psyches: {
        alice: [],
        bob: [{ disorderId: 'anxiety', drugId: 'anxietyTreatment', episodeActive: null }],
      },
      hands: { alice: ['depression'], bob: [] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'giveDisorder', cardId: 'depression', targetUid: 'bob' },
    });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.psyches.bob.map((e) => e.disorderId)).toEqual(['anxiety', 'depression']);
    expect(state.psyches.bob[1].drugId).toBeNull();
  });

  it('therapy: discards the disorder + therapy card, can complete the psyche', async () => {
    const { handlers, getDoc, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'anorexia', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['therapy'], bob: [] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'therapy', cardId: 'therapy', ownDisorderId: 'anorexia' },
    });

    const room = getDoc(`gameRooms/${roomId}`);
    const secret = getDoc(`gameRooms/${roomId}/secret/deck`);
    expect(room.status).toBe('completed'); // psyche is now empty -> vacuously fully treated
    expect(secret.discardPile.sort()).toEqual(['anorexia', 'therapy']);
  });

  it('episode: triggers the target disorder\'s punishment and discards the episode card', async () => {
    const { handlers, getDoc, roomId } = seedGame({
      psyches: {
        alice: [],
        bob: [{ disorderId: 'suicidalThoughts', drugId: null, episodeActive: null }],
      },
      hands: { alice: ['episode'], bob: ['x', 'y'] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'episode', cardId: 'episode', targetUid: 'bob', targetDisorderId: 'suicidalThoughts' },
    });

    expect(getDoc(`gameRooms/${roomId}/hands/bob`).cards).toEqual([]);
    const secret = getDoc(`gameRooms/${roomId}/secret/deck`);
    expect(secret.discardPile).toEqual(['episode']);
  });

  it('episode: a persistent punishment (depression) is recorded on state.restrictions', async () => {
    const { handlers, getDoc, roomId } = seedGame({
      psyches: {
        alice: [],
        bob: [{ disorderId: 'depression', drugId: null, episodeActive: null }],
      },
      hands: { alice: ['episode'], bob: [] },
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'episode', cardId: 'episode', targetUid: 'bob', targetDisorderId: 'depression' },
    });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.restrictions.bob.depression).toBe(true);
    expect(state.psyches.bob[0].episodeActive).toBe('depression');
  });

  it('booster actions are rejected when ruleset is base', async () => {
    const { handlers, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'anxiety', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['misdiagnosis', 'madness'], bob: [] },
      ruleset: 'base',
    });

    await expect(
      handlers.playAction({
        auth: { uid: 'alice' },
        data: { roomId, actionType: 'misdiagnosis', cardId: 'misdiagnosis', ownDisorderId: 'anxiety', handDisorderId: 'madness' },
      })
    ).rejects.toThrow();
  });

  it('highTolerance (booster) un-treats a target disorder', async () => {
    const { handlers, getDoc, roomId } = seedGame({
      psyches: {
        alice: [],
        bob: [{ disorderId: 'anxiety', drugId: 'anxietyTreatment', episodeActive: null }],
      },
      hands: { alice: ['highTolerance'], bob: [] },
      ruleset: 'booster',
    });

    await handlers.playAction({
      auth: { uid: 'alice' },
      data: { roomId, actionType: 'highTolerance', cardId: 'highTolerance', targetUid: 'bob', targetDisorderId: 'anxiety' },
    });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.psyches.bob[0].drugId).toBeNull();
    const secret = getDoc(`gameRooms/${roomId}/secret/deck`);
    expect(secret.discardPile.sort()).toEqual(['anxietyTreatment', 'highTolerance']);
  });

  it('rejects an action from a player whose turn it is not', async () => {
    const { handlers, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'anxiety', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['anxietyTreatment'], bob: ['anxietyTreatment'] },
    });

    await expect(
      handlers.playAction({ auth: { uid: 'bob' }, data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' } })
    ).rejects.toThrow();
  });

  it('rejects an illegal move (drug does not match the targeted disorder)', async () => {
    const { handlers, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'madness', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['anxietyTreatment'], bob: [] },
    });

    await expect(
      handlers.playAction({ auth: { uid: 'alice' }, data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' } })
    ).rejects.toThrow();
  });

  it('rejects a 3rd move in the same turn', async () => {
    const { handlers, getDoc, setDoc, roomId } = seedGame({
      psyches: { alice: [{ disorderId: 'anxiety', drugId: null, episodeActive: null }], bob: [] },
      hands: { alice: ['anxietyTreatment'], bob: [] },
    });
    const stateBefore = getDoc(`gameRooms/${roomId}/state/current`);
    setDoc(`gameRooms/${roomId}/state/current`, { ...stateBefore, movesThisTurn: 2 });

    await expect(
      handlers.playAction({ auth: { uid: 'alice' }, data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' } })
    ).rejects.toThrow();
  });
});

describe('endTurn (orchestration + restriction lifecycle)', () => {
  function seedTurn({ roomId = 'room1', playerUids = ['alice', 'bob'], hands, restrictions, psyches, drawPile = ['x', 'y', 'z', 'w'] }) {
    const { db, getDoc, setDoc } = createFakeFirestore();
    setDoc(`gameRooms/${roomId}`, { ...makeRoom({ roomId, hostUid: playerUids[0], playerUids }), status: 'active' });
    setDoc(`gameRooms/${roomId}/state/current`, {
      ruleset: 'base',
      turnOrder: playerUids,
      turnUid: playerUids[0],
      turnNumber: 1,
      movesThisTurn: 1,
      deckCount: drawPile.length,
      discardCount: 0,
      psyches: psyches || Object.fromEntries(playerUids.map((u) => [u, []])),
      restrictions: restrictions || Object.fromEntries(playerUids.map((u) => [u, {}])),
      phase: 'playing',
      winnerUid: null,
      logSeq: 0,
    });
    for (const [uid, cards] of Object.entries(hands)) {
      setDoc(`gameRooms/${roomId}/hands/${uid}`, { cards });
    }
    setDoc(`gameRooms/${roomId}/secret/deck`, { drawPile, discardPile: [] });
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    return { handlers, getDoc, roomId };
  }

  it('advances turnUid, draws 2 for the arriving player without dropping their existing hand', async () => {
    const { handlers, getDoc, roomId } = seedTurn({
      hands: { alice: [], bob: ['keep-me'] },
    });

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId } });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.turnUid).toBe('bob');
    expect(state.turnNumber).toBe(2);
    expect(state.movesThisTurn).toBe(0);
    const bobHand = getDoc(`gameRooms/${roomId}/hands/bob`).cards;
    expect(bobHand).toContain('keep-me');
    expect(bobHand).toHaveLength(3); // kept + 2 drawn
  });

  it('discards down to the hand cap of 6 when instructed', async () => {
    const { handlers, getDoc, roomId } = seedTurn({
      hands: { alice: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], bob: [] },
    });

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId, discardCardIds: ['g'] } });

    expect(getDoc(`gameRooms/room1/hands/alice`).cards).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    const secret = getDoc(`gameRooms/room1/secret/deck`);
    expect(secret.discardPile).toEqual(['g']);
  });

  it('rejects ending a turn over the hand cap without discarding enough', async () => {
    const { handlers, roomId } = seedTurn({
      hands: { alice: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], bob: [] },
    });

    await expect(handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId, discardCardIds: [] } })).rejects.toThrow();
  });

  it('depression: the arriving player is skipped entirely (no draw), turn passes to the following player', async () => {
    const { handlers, getDoc, roomId } = seedTurn({
      playerUids: ['alice', 'bob', 'cleo'],
      hands: { alice: [], bob: [], cleo: [] },
      restrictions: { alice: {}, bob: { depression: true }, cleo: {} },
      psyches: {
        alice: [],
        bob: [{ disorderId: 'depression', drugId: null, episodeActive: 'depression' }],
        cleo: [],
      },
    });

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId } });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.turnUid).toBe('cleo'); // bob was skipped
    expect(state.restrictions.bob.depression).toBe(false);
    expect(state.psyches.bob[0].episodeActive).toBeNull();
    expect(getDoc(`gameRooms/${roomId}/hands/bob`).cards).toEqual([]); // never drew
  });

  it('anorexia: the arriving player takes their turn but does not draw', async () => {
    const { handlers, getDoc, roomId } = seedTurn({
      hands: { alice: [], bob: ['keep-me'] },
      restrictions: { alice: {}, bob: { anorexia: true } },
      psyches: { alice: [], bob: [{ disorderId: 'anorexia', drugId: null, episodeActive: 'anorexia' }] },
    });

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId } });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.turnUid).toBe('bob');
    expect(state.restrictions.bob.anorexia).toBe(false);
    expect(state.psyches.bob[0].episodeActive).toBeNull();
    expect(getDoc(`gameRooms/${roomId}/hands/bob`).cards).toEqual(['keep-me']); // unchanged, no draw
  });

  it('impotence: cleared when the restricted player ends their own turn, blocks plays until then', async () => {
    const { handlers, getDoc, roomId } = seedTurn({
      playerUids: ['alice', 'bob'],
      hands: { alice: ['anxietyTreatment'], bob: [] },
      restrictions: { alice: { impotence: true }, bob: {} },
      psyches: { alice: [{ disorderId: 'anxiety', drugId: null, episodeActive: 'impotence' }], bob: [] },
    });

    await expect(
      handlers.playAction({ auth: { uid: 'alice' }, data: { roomId, actionType: 'treat', cardId: 'anxietyTreatment' } })
    ).rejects.toThrow();

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId } });

    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(state.restrictions.alice.impotence).toBe(false);
    expect(state.psyches.alice[0].episodeActive).toBeNull();
  });

  it('reshuffles the discard pile into the draw pile once it empties mid-draw', async () => {
    const { db, getDoc, setDoc } = createFakeFirestore();
    const roomId = 'room1';
    const playerUids = ['alice', 'bob'];
    setDoc(`gameRooms/${roomId}`, { ...makeRoom({ roomId, hostUid: 'alice', playerUids }), status: 'active' });
    setDoc(`gameRooms/${roomId}/state/current`, {
      ruleset: 'base',
      turnOrder: playerUids,
      turnUid: 'alice',
      turnNumber: 1,
      movesThisTurn: 1,
      deckCount: 1,
      discardCount: 2,
      psyches: { alice: [], bob: [] },
      restrictions: { alice: {}, bob: {} },
      phase: 'playing',
      winnerUid: null,
      logSeq: 0,
    });
    setDoc(`gameRooms/${roomId}/hands/alice`, { cards: [] });
    setDoc(`gameRooms/${roomId}/hands/bob`, { cards: [] });
    // Only 1 card left in the draw pile but a 2-card draw is needed — the
    // 2nd draw must come from reshuffling the discard pile.
    setDoc(`gameRooms/${roomId}/secret/deck`, { drawPile: ['only-one'], discardPile: ['x', 'y'] });
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });

    await handlers.endTurn({ auth: { uid: 'alice' }, data: { roomId } });

    const bobHand = getDoc(`gameRooms/${roomId}/hands/bob`).cards;
    expect(bobHand).toHaveLength(2);
    expect(bobHand).toContain('only-one');
    const secret = getDoc(`gameRooms/${roomId}/secret/deck`);
    // Reshuffle brings both 'x' and 'y' into the draw pile; only 1 of them
    // was needed to satisfy the 2-card draw, so 1 remains.
    expect(secret.discardPile).toEqual([]);
    expect(secret.drawPile).toHaveLength(1);
  });
});

describe('full game playthrough (fake Firestore)', () => {
  // A deliberately simple "always treat if possible, otherwise Therapy,
  // otherwise pass" bot — no offense (Give-a-Disorder/Episode/booster) —
  // guarantees monotonic progress toward a win so the loop is bounded, while
  // still exercising dealPsyches -> playAction -> endTurn orchestration
  // end-to-end many times over, including the reshuffle-on-empty path.
  function chooseAction(hand, psyche) {
    for (const cardId of hand) {
      const def = CARD_DEFS[cardId];
      if (def?.type === 'drug') {
        const entry = psyche.find((e) => e.disorderId === def.treats && !e.drugId);
        if (entry) return { actionType: 'treat', cardId };
      }
    }
    if (hand.includes('therapy')) {
      const entry = psyche.find((e) => e.disorderId !== 'tremors');
      if (entry) return { actionType: 'therapy', cardId: 'therapy', ownDisorderId: entry.disorderId };
    }
    return null;
  }

  it('plays a 2-player game to completion and records stats', async () => {
    const { db, getDoc, setDoc, getCollection } = createFakeFirestore();
    const handlers = createHandlers({ db, FieldValue: fakeFieldValue, messaging: makeFakeMessaging() });
    const playerUids = ['alice', 'bob'];
    const roomId = 'fullgame';
    setDoc(`gameRooms/${roomId}`, makeRoom({ roomId, hostUid: 'alice', playerUids }));

    await handlers.dealPsyches({ auth: { uid: 'alice' }, data: { roomId } });

    for (let i = 0; i < 4000; i++) {
      const room = getDoc(`gameRooms/${roomId}`);
      if (room.status === 'completed') break;
      const state = getDoc(`gameRooms/${roomId}/state/current`);
      const uid = state.turnUid;

      if (state.movesThisTurn < 2) {
        const hand = getDoc(`gameRooms/${roomId}/hands/${uid}`).cards;
        const action = chooseAction(hand, state.psyches[uid]);
        if (action) {
          await handlers.playAction({ auth: { uid }, data: { roomId, ...action } });
          continue;
        }
      }

      const hand = getDoc(`gameRooms/${roomId}/hands/${uid}`).cards;
      const discardCardIds = hand.length > 6 ? hand.slice(6) : [];
      await handlers.endTurn({ auth: { uid }, data: { roomId, discardCardIds } });
    }

    const room = getDoc(`gameRooms/${roomId}`);
    const state = getDoc(`gameRooms/${roomId}/state/current`);
    expect(room.status).toBe('completed');
    expect(state.phase).toBe('gameEnd');
    expect(playerUids).toContain(state.winnerUid);

    for (const uid of playerUids) {
      expect(getDoc(`users/${uid}`).stats['side-effects'].gamesPlayed).toBe(1);
    }
    const winnerActivity = getCollection(`users/${state.winnerUid}/activity`);
    expect(winnerActivity.map((a) => a.type)).toContain('game_won');
  }, 20000);
});
