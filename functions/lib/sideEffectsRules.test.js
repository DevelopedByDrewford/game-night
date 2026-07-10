import { describe, it, expect } from 'vitest';
import {
  dealPsyches,
  vulnerableDisorders,
  isLegalPlay,
  applyTreat,
  applyGiveDisorder,
  applyTherapy,
  applyEpisode,
  applyMisdiagnosis,
  applyHighTolerance,
  isPsycheFullyTreated,
  nextTurnUid,
} from './sideEffectsRules.js';

function psycheOf(...entries) {
  return entries.map(([disorderId, drugId = null, episodeActive = null]) => ({ disorderId, drugId, episodeActive }));
}

describe('dealPsyches', () => {
  it('deals psycheSize unique disorders per player, in turnOrder', () => {
    const pile = ['anxiety', 'depression', 'madness', 'impotence', 'tremors', 'anorexia'];
    const { psyches, leftoverDisorders } = dealPsyches(pile, ['a', 'b'], 3);
    expect(psyches.a.map((e) => e.disorderId)).toEqual(['anxiety', 'depression', 'madness']);
    expect(psyches.b.map((e) => e.disorderId)).toEqual(['impotence', 'tremors', 'anorexia']);
    expect(leftoverDisorders).toEqual([]);
    for (const entry of [...psyches.a, ...psyches.b]) {
      expect(entry.drugId).toBeNull();
      expect(entry.episodeActive).toBeNull();
    }
  });

  it('cycles a would-be duplicate to the bottom of the pile and deals the next card instead', () => {
    // 'anxiety' appears twice up front — the second copy must be skipped
    // for player 'a' (already has one) and cycled to the bottom, then
    // re-drawn once it's no longer a duplicate.
    const pile = ['anxiety', 'anxiety', 'depression'];
    const { psyches, leftoverDisorders } = dealPsyches(pile, ['a'], 2);
    expect(psyches.a.map((e) => e.disorderId)).toEqual(['anxiety', 'depression']);
    expect(leftoverDisorders).toEqual(['anxiety']);
  });

  it('throws if the pile runs out mid-deal', () => {
    expect(() => dealPsyches(['anxiety'], ['a'], 4)).toThrow();
  });
});

describe('vulnerableDisorders', () => {
  it('is empty for a psyche with no active drugs', () => {
    expect(vulnerableDisorders(psycheOf(['anxiety']))).toEqual(new Set());
  });

  it('unions side-effect lists across every treated disorder', () => {
    const psyche = psycheOf(['anxiety', 'anxietyTreatment'], ['gamblingAddiction', 'gamblingAddictionTreatment']);
    // anxietyTreatment -> suicidalThoughts, depression, madness
    // gamblingAddictionTreatment -> impotence
    expect(vulnerableDisorders(psyche)).toEqual(new Set(['suicidalThoughts', 'depression', 'madness', 'impotence']));
  });
});

describe('isLegalPlay', () => {
  it('rejects playing a card not in hand', () => {
    const result = isLegalPlay({
      actionType: 'treat',
      hand: ['therapy'],
      cardId: 'anxietyTreatment',
      callerUid: 'a',
      psyches: { a: psycheOf(['anxiety']) },
      restrictions: {},
    });
    expect(result).toEqual({ legal: false, reason: 'CARD_NOT_HELD' });
  });

  it('rejects any play while Impotence-restricted', () => {
    const result = isLegalPlay({
      actionType: 'treat',
      hand: ['anxietyTreatment'],
      cardId: 'anxietyTreatment',
      callerUid: 'a',
      psyches: { a: psycheOf(['anxiety']) },
      restrictions: { a: { impotence: true } },
    });
    expect(result).toEqual({ legal: false, reason: 'IMPOTENCE_RESTRICTED' });
  });

  describe('treat', () => {
    it('is legal for a matching, untreated disorder', () => {
      const result = isLegalPlay({
        actionType: 'treat',
        hand: ['anxietyTreatment'],
        cardId: 'anxietyTreatment',
        callerUid: 'a',
        psyches: { a: psycheOf(['anxiety']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: true });
    });

    it('rejects a disorder not in the psyche', () => {
      const result = isLegalPlay({
        actionType: 'treat',
        hand: ['anxietyTreatment'],
        cardId: 'anxietyTreatment',
        callerUid: 'a',
        psyches: { a: psycheOf(['madness']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'DISORDER_NOT_IN_PSYCHE' });
    });

    it('rejects an already-treated disorder', () => {
      const result = isLegalPlay({
        actionType: 'treat',
        hand: ['anxietyTreatment'],
        cardId: 'anxietyTreatment',
        callerUid: 'a',
        psyches: { a: psycheOf(['anxiety', 'anxietyTreatment']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'ALREADY_TREATED' });
    });
  });

  describe('giveDisorder', () => {
    const psyches = { b: psycheOf(['anxiety', 'anxietyTreatment']) };

    it('is legal when the target is vulnerable and lacks the disorder', () => {
      const result = isLegalPlay({
        actionType: 'giveDisorder',
        hand: ['madness'],
        cardId: 'madness',
        callerUid: 'a',
        targetUid: 'b',
        psyches,
        restrictions: {},
      });
      expect(result).toEqual({ legal: true });
    });

    it('rejects a disorder not on any active drug\'s side-effect list', () => {
      const result = isLegalPlay({
        actionType: 'giveDisorder',
        hand: ['tremors'],
        cardId: 'tremors',
        callerUid: 'a',
        targetUid: 'b',
        psyches,
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'NOT_VULNERABLE' });
    });

    it('rejects giving a disorder the target already has', () => {
      const result = isLegalPlay({
        actionType: 'giveDisorder',
        hand: ['anxiety'],
        cardId: 'anxiety',
        callerUid: 'a',
        targetUid: 'b',
        psyches,
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'ALREADY_HAS_DISORDER' });
    });

    it('rejects targeting an untreated player (not vulnerable to anything)', () => {
      const result = isLegalPlay({
        actionType: 'giveDisorder',
        hand: ['madness'],
        cardId: 'madness',
        callerUid: 'a',
        targetUid: 'c',
        psyches: { c: psycheOf(['tremors']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'NOT_VULNERABLE' });
    });
  });

  describe('therapy', () => {
    it('is legal for any own disorder except tremors', () => {
      const result = isLegalPlay({
        actionType: 'therapy',
        hand: ['therapy'],
        cardId: 'therapy',
        callerUid: 'a',
        ownDisorderId: 'anorexia',
        psyches: { a: psycheOf(['anorexia']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: true });
    });

    it('rejects tremors — immune to therapy', () => {
      const result = isLegalPlay({
        actionType: 'therapy',
        hand: ['therapy'],
        cardId: 'therapy',
        callerUid: 'a',
        ownDisorderId: 'tremors',
        psyches: { a: psycheOf(['tremors']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'TREMORS_IMMUNE_TO_THERAPY' });
    });
  });

  describe('episode', () => {
    it('is legal against an untreated disorder', () => {
      const result = isLegalPlay({
        actionType: 'episode',
        hand: ['episode'],
        cardId: 'episode',
        callerUid: 'a',
        targetUid: 'b',
        targetDisorderId: 'anxiety',
        psyches: { b: psycheOf(['anxiety']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: true });
    });

    it('rejects a treated disorder (immune while covered)', () => {
      const result = isLegalPlay({
        actionType: 'episode',
        hand: ['episode'],
        cardId: 'episode',
        callerUid: 'a',
        targetUid: 'b',
        targetDisorderId: 'anxiety',
        psyches: { b: psycheOf(['anxiety', 'anxietyTreatment']) },
        restrictions: {},
      });
      expect(result).toEqual({ legal: false, reason: 'DISORDER_TREATED' });
    });
  });

  describe('booster actions', () => {
    it('rejects misdiagnosis/highTolerance when ruleset is base', () => {
      expect(
        isLegalPlay({
          actionType: 'misdiagnosis',
          hand: ['misdiagnosis', 'madness'],
          cardId: 'misdiagnosis',
          callerUid: 'a',
          ownDisorderId: 'anxiety',
          handDisorderId: 'madness',
          psyches: { a: psycheOf(['anxiety']) },
          restrictions: {},
          ruleset: 'base',
        })
      ).toEqual({ legal: false, reason: 'BOOSTER_NOT_ENABLED' });
    });

    it('allows misdiagnosis when booster is enabled and both disorders are available', () => {
      const result = isLegalPlay({
        actionType: 'misdiagnosis',
        hand: ['misdiagnosis', 'madness'],
        cardId: 'misdiagnosis',
        callerUid: 'a',
        ownDisorderId: 'anxiety',
        handDisorderId: 'madness',
        psyches: { a: psycheOf(['anxiety']) },
        restrictions: {},
        ruleset: 'booster',
      });
      expect(result).toEqual({ legal: true });
    });

    it('allows highTolerance only against a treated disorder', () => {
      const legal = isLegalPlay({
        actionType: 'highTolerance',
        hand: ['highTolerance'],
        cardId: 'highTolerance',
        callerUid: 'a',
        targetUid: 'b',
        targetDisorderId: 'anxiety',
        psyches: { b: psycheOf(['anxiety', 'anxietyTreatment']) },
        restrictions: {},
        ruleset: 'booster',
      });
      expect(legal).toEqual({ legal: true });

      const illegal = isLegalPlay({
        actionType: 'highTolerance',
        hand: ['highTolerance'],
        cardId: 'highTolerance',
        callerUid: 'a',
        targetUid: 'b',
        targetDisorderId: 'anxiety',
        psyches: { b: psycheOf(['anxiety']) },
        restrictions: {},
        ruleset: 'booster',
      });
      expect(illegal).toEqual({ legal: false, reason: 'NOT_TREATED' });
    });
  });
});

describe('applyTreat', () => {
  it('sets drugId on the matching psyche entry and removes the drug from hand', () => {
    const result = applyTreat({
      callerUid: 'a',
      cardId: 'anxietyTreatment',
      hand: ['anxietyTreatment', 'therapy'],
      psyches: { a: psycheOf(['anxiety']) },
    });
    expect(result.newPsyches.a).toEqual([{ disorderId: 'anxiety', drugId: 'anxietyTreatment', episodeActive: null }]);
    expect(result.newHand).toEqual(['therapy']);
  });
});

describe('applyGiveDisorder', () => {
  it('appends a new untreated disorder to the target psyche and removes the card from hand', () => {
    const result = applyGiveDisorder({
      targetUid: 'b',
      cardId: 'madness',
      hand: ['madness'],
      psyches: { b: psycheOf(['anxiety', 'anxietyTreatment']) },
    });
    expect(result.newPsyches.b).toEqual([
      { disorderId: 'anxiety', drugId: 'anxietyTreatment', episodeActive: null },
      { disorderId: 'madness', drugId: null, episodeActive: null },
    ]);
    expect(result.newHand).toEqual([]);
  });
});

describe('applyTherapy', () => {
  it('removes the disorder entirely from the psyche and discards therapy', () => {
    const result = applyTherapy({
      callerUid: 'a',
      ownDisorderId: 'anorexia',
      hand: ['therapy'],
      psyches: { a: psycheOf(['anorexia'], ['madness']) },
    });
    expect(result.newPsyches.a).toEqual([{ disorderId: 'madness', drugId: null, episodeActive: null }]);
    expect(result.newHand).toEqual([]);
  });
});

describe('applyEpisode', () => {
  const pickFirst = (arr) => arr[0];

  it('anxiety: inflictor takes a card from the target hand', () => {
    const result = applyEpisode({
      callerUid: 'a',
      targetUid: 'b',
      targetDisorderId: 'anxiety',
      psyches: { b: psycheOf(['anxiety']) },
      hands: { a: [], b: ['madness', 'therapy'] },
      pickRandom: pickFirst,
    });
    expect(result.newHands.b).toEqual(['therapy']);
    expect(result.newHands.a).toEqual(['madness']);
    expect(result.persistentRestriction).toBeNull();
  });

  it('gamblingAddiction: inflictor draws up to 3 random cards', () => {
    const result = applyEpisode({
      callerUid: 'a',
      targetUid: 'b',
      targetDisorderId: 'gamblingAddiction',
      psyches: { b: psycheOf(['gamblingAddiction']) },
      hands: { a: [], b: ['x', 'y'] },
      pickRandom: pickFirst,
    });
    expect(result.newHands.b).toEqual([]);
    expect(result.newHands.a.sort()).toEqual(['x', 'y']);
  });

  it('madness: discards every active drug from the target psyche', () => {
    const result = applyEpisode({
      callerUid: 'a',
      targetUid: 'b',
      targetDisorderId: 'madness',
      psyches: { b: psycheOf(['anxiety', 'anxietyTreatment'], ['madness']) },
      hands: { a: [], b: [] },
      pickRandom: pickFirst,
    });
    expect(result.newPsyches.b.find((e) => e.disorderId === 'anxiety').drugId).toBeNull();
  });

  it('suicidalThoughts: discards the entire target hand', () => {
    const result = applyEpisode({
      callerUid: 'a',
      targetUid: 'b',
      targetDisorderId: 'suicidalThoughts',
      psyches: { b: psycheOf(['suicidalThoughts']) },
      hands: { a: [], b: ['x', 'y', 'z'] },
      pickRandom: pickFirst,
    });
    expect(result.newHands.b).toEqual([]);
  });

  it('tremors: discards min(3, hand.length) random cards, no timer', () => {
    const result = applyEpisode({
      callerUid: 'a',
      targetUid: 'b',
      targetDisorderId: 'tremors',
      psyches: { b: psycheOf(['tremors']) },
      hands: { a: [], b: ['x', 'y'] },
      pickRandom: pickFirst,
    });
    expect(result.newHands.b).toEqual([]);
  });

  it('anorexia/depression/impotence set a persistent restriction and mark the psyche entry askew', () => {
    for (const disorderId of ['anorexia', 'depression', 'impotence']) {
      const result = applyEpisode({
        callerUid: 'a',
        targetUid: 'b',
        targetDisorderId: disorderId,
        psyches: { b: psycheOf([disorderId]) },
        hands: { a: [], b: [] },
        pickRandom: pickFirst,
      });
      expect(result.persistentRestriction).toBe(disorderId);
      expect(result.newPsyches.b[0].episodeActive).toBe(disorderId);
    }
  });
});

describe('applyMisdiagnosis', () => {
  it('swaps a psyche disorder for a hand disorder and keeps the swapped-out one in hand', () => {
    const result = applyMisdiagnosis({
      callerUid: 'a',
      ownDisorderId: 'anxiety',
      handDisorderId: 'madness',
      hand: ['misdiagnosis', 'madness'],
      psyches: { a: psycheOf(['anxiety']) },
    });
    expect(result.newPsyches.a).toEqual([{ disorderId: 'madness', drugId: null, episodeActive: null }]);
    expect(result.newHand).toEqual(['anxiety']);
  });
});

describe('applyHighTolerance', () => {
  it('un-treats the target disorder', () => {
    const result = applyHighTolerance({
      targetUid: 'b',
      targetDisorderId: 'anxiety',
      hand: ['highTolerance'],
      psyches: { b: psycheOf(['anxiety', 'anxietyTreatment']) },
    });
    expect(result.newPsyches.b).toEqual([{ disorderId: 'anxiety', drugId: null, episodeActive: null }]);
  });
});

describe('isPsycheFullyTreated', () => {
  it('is true only when every entry has a drug', () => {
    expect(isPsycheFullyTreated(psycheOf(['anxiety', 'anxietyTreatment'], ['madness', 'madnessTreatment']))).toBe(true);
    expect(isPsycheFullyTreated(psycheOf(['anxiety', 'anxietyTreatment'], ['madness']))).toBe(false);
  });

  it('is vacuously true for an empty psyche', () => {
    expect(isPsycheFullyTreated([])).toBe(true);
  });
});

describe('nextTurnUid', () => {
  it('cycles through turnOrder with no elimination to account for', () => {
    expect(nextTurnUid(['a', 'b', 'c'], 'a')).toBe('b');
    expect(nextTurnUid(['a', 'b', 'c'], 'c')).toBe('a');
  });
});
