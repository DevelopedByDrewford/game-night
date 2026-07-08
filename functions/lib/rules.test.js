import { describe, it, expect } from 'vitest';
import {
  dealSetup,
  isCountessForced,
  legalTargets,
  isLegalPlay,
  applyCardEffect,
  pickRoundWinners,
  nextActiveUid,
} from './rules.js';

describe('dealSetup', () => {
  it('removes 1 face-down reserve card for 3-4 players, no face-up set-aside', () => {
    const deck = Array.from({ length: 16 }, (_, i) => `card${i}`);
    const { reserveCard, setAsideVisible, drawPile } = dealSetup(deck, 3);
    expect(reserveCard).toBe('card0');
    expect(setAsideVisible).toEqual([]);
    expect(drawPile).toHaveLength(15);
  });

  it('removes 1 face-down + 3 face-up cards for 2 players', () => {
    const deck = Array.from({ length: 16 }, (_, i) => `card${i}`);
    const { reserveCard, setAsideVisible, drawPile } = dealSetup(deck, 2);
    expect(reserveCard).toBe('card0');
    expect(setAsideVisible).toEqual(['card1', 'card2', 'card3']);
    expect(drawPile).toHaveLength(12);
  });
});

describe('isCountessForced', () => {
  it('forces countess discard when held with king or prince', () => {
    expect(isCountessForced(['countess', 'king'])).toBe(true);
    expect(isCountessForced(['countess', 'prince'])).toBe(true);
    expect(isCountessForced(['countess', 'guard'])).toBe(false);
    expect(isCountessForced(['king', 'prince'])).toBe(false);
  });
});

describe('legalTargets', () => {
  it('excludes self and protected players for guard/priest/baron/king', () => {
    const targets = legalTargets('guard', 'a', ['a', 'b', 'c'], ['b']);
    expect(targets).toEqual(['c']);
  });

  it('always includes self for prince, never empty', () => {
    const targets = legalTargets('prince', 'a', ['a'], []);
    expect(targets).toEqual(['a']);
  });
});

describe('isLegalPlay', () => {
  const base = { hand: ['guard', 'countess'], cardId: 'guard', callerUid: 'a', aliveUids: ['a', 'b'], protectedUids: [] };

  it('rejects playing a card not in hand', () => {
    expect(isLegalPlay({ ...base, cardId: 'king' }).legal).toBe(false);
  });

  it('rejects king/prince while holding countess', () => {
    const result = isLegalPlay({ ...base, hand: ['countess', 'king'], cardId: 'king', targetUid: 'b' });
    expect(result).toEqual({ legal: false, reason: 'ILLEGAL_COUNTESS' });
  });

  it('requires a valid target for guard', () => {
    expect(isLegalPlay({ ...base, targetUid: null }).legal).toBe(false);
    expect(isLegalPlay({ ...base, targetUid: 'a', guessCardId: 'priest' }).legal).toBe(false);
    expect(isLegalPlay({ ...base, targetUid: 'b', guessCardId: 'priest' }).legal).toBe(true);
  });

  it('rejects guessing guard itself', () => {
    expect(isLegalPlay({ ...base, targetUid: 'b', guessCardId: 'guard' })).toEqual({ legal: false, reason: 'BAD_GUESS' });
  });

  it('allows a null target only when no legal targets exist', () => {
    const allProtected = { ...base, protectedUids: ['b'] };
    expect(isLegalPlay({ ...allProtected, targetUid: null }).legal).toBe(true);
    expect(isLegalPlay({ ...allProtected, targetUid: 'b', guessCardId: 'priest' }).legal).toBe(false);
  });

  it('rejects a target for untargeted cards like handmaid', () => {
    const result = isLegalPlay({ ...base, hand: ['handmaid', 'king'], cardId: 'handmaid', targetUid: 'b' });
    expect(result).toEqual({ legal: false, reason: 'BAD_TARGET' });
  });
});

describe('applyCardEffect', () => {
  it('guard: correct guess eliminates the target', () => {
    const hands = { a: ['guard', 'king'], b: ['priest'] };
    const result = applyCardEffect({ cardId: 'guard', callerUid: 'a', targetUid: 'b', guessCardId: 'priest', hands });
    expect(result.eliminatedUids).toEqual(['b']);
    expect(result.newHands.a).toEqual(['king']);
  });

  it('guard: wrong guess has no effect', () => {
    const hands = { a: ['guard', 'king'], b: ['priest'] };
    const result = applyCardEffect({ cardId: 'guard', callerUid: 'a', targetUid: 'b', guessCardId: 'baron', hands });
    expect(result.eliminatedUids).toEqual([]);
  });

  it('priest: returns a private peek, never revealing via logMessage', () => {
    const hands = { a: ['priest', 'king'], b: ['baron'] };
    const result = applyCardEffect({ cardId: 'priest', callerUid: 'a', targetUid: 'b', hands });
    expect(result.peek).toEqual({ viewerUid: 'a', targetUid: 'b', card: 'baron' });
    expect(result.logMessage).not.toContain('baron');
  });

  it('baron: lower value is eliminated', () => {
    const hands = { a: ['baron', 'guard'], b: ['king'] };
    const result = applyCardEffect({ cardId: 'baron', callerUid: 'a', targetUid: 'b', hands });
    expect(result.eliminatedUids).toEqual(['a']);
  });

  it('baron: tie has no effect', () => {
    const hands = { a: ['baron', 'priest'], b: ['priest'] };
    const result = applyCardEffect({ cardId: 'baron', callerUid: 'a', targetUid: 'b', hands });
    expect(result.eliminatedUids).toEqual([]);
  });

  it('handmaid: protects the caller', () => {
    const hands = { a: ['handmaid', 'king'] };
    const result = applyCardEffect({ cardId: 'handmaid', callerUid: 'a', hands });
    expect(result.protectUid).toBe('a');
  });

  it('prince: discarding the princess eliminates, no redraw', () => {
    const hands = { a: ['prince', 'guard'], b: ['princess'] };
    const result = applyCardEffect({ cardId: 'prince', callerUid: 'a', targetUid: 'b', hands });
    expect(result.eliminatedUids).toEqual(['b']);
    expect(result.needsRedrawUid).toBeNull();
  });

  it('prince: discarding a non-princess card needs a redraw', () => {
    const hands = { a: ['prince', 'guard'], b: ['king'] };
    const result = applyCardEffect({ cardId: 'prince', callerUid: 'a', targetUid: 'b', hands });
    expect(result.eliminatedUids).toEqual([]);
    expect(result.needsRedrawUid).toBe('b');
    expect(result.newHands.b).toEqual([]);
  });

  it('king: swaps hands with the target', () => {
    const hands = { a: ['king', 'guard'], b: ['priest'] };
    const result = applyCardEffect({ cardId: 'king', callerUid: 'a', targetUid: 'b', hands });
    expect(result.newHands.a).toEqual(['priest']);
    expect(result.newHands.b).toEqual(['guard']);
  });

  it('king: fizzles with no legal target instead of crashing', () => {
    const hands = { a: ['king', 'guard'] };
    const result = applyCardEffect({ cardId: 'king', callerUid: 'a', targetUid: null, hands });
    expect(result.newHands.a).toEqual(['guard']);
    expect(result.eliminatedUids).toEqual([]);
  });

  it('princess: playing it yourself eliminates you', () => {
    const hands = { a: ['princess', 'guard'] };
    const result = applyCardEffect({ cardId: 'princess', callerUid: 'a', hands });
    expect(result.eliminatedUids).toEqual(['a']);
  });
});

describe('pickRoundWinners', () => {
  const hands = { a: ['king'], b: ['priest'], c: ['king'] };

  it('picks the sole highest hand when unique', () => {
    expect(pickRoundWinners(['a', 'b'], hands, {})).toEqual(['a']);
  });

  it('breaks ties by discard pile sum', () => {
    const discardPiles = { a: ['guard', 'baron'], c: ['princess'] };
    expect(pickRoundWinners(['a', 'c'], hands, discardPiles)).toEqual(['c']);
  });

  it('shares the win if still tied after discard sum', () => {
    const discardPiles = { a: ['guard'], c: ['guard'] };
    expect(pickRoundWinners(['a', 'c'], hands, discardPiles)).toEqual(['a', 'c']);
  });

  it('returns the sole survivor outright', () => {
    expect(pickRoundWinners(['a'], hands, {})).toEqual(['a']);
  });
});

describe('nextActiveUid', () => {
  it('wraps around and skips eliminated players', () => {
    expect(nextActiveUid(['a', 'b', 'c'], 'a', ['b'])).toBe('c');
    expect(nextActiveUid(['a', 'b', 'c'], 'c', [])).toBe('a');
  });
});
