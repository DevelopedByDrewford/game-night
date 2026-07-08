import { describe, it, expect } from 'vitest';
import { buildDeck, bracketForPlayerCount, cardValue, TOKENS_TO_WIN } from './deck.js';

describe('buildDeck', () => {
  it('builds the standard 16-card deck for 2-4 players', () => {
    for (const count of [2, 3, 4]) {
      const deck = buildDeck(count);
      expect(deck).toHaveLength(16);
      expect(deck.filter((c) => c === 'guard')).toHaveLength(5);
      expect(deck.filter((c) => c === 'priest')).toHaveLength(2);
      expect(deck.filter((c) => c === 'baron')).toHaveLength(2);
      expect(deck.filter((c) => c === 'handmaid')).toHaveLength(2);
      expect(deck.filter((c) => c === 'prince')).toHaveLength(2);
      expect(deck.filter((c) => c === 'king')).toHaveLength(1);
      expect(deck.filter((c) => c === 'countess')).toHaveLength(1);
      expect(deck.filter((c) => c === 'princess')).toHaveLength(1);
    }
  });

  it('rejects unsupported player counts (5-8 not built yet)', () => {
    expect(() => buildDeck(5)).toThrow();
    expect(() => buildDeck(1)).toThrow();
    expect(bracketForPlayerCount(5)).toBeNull();
  });

  it('has ascending card values matching name order', () => {
    expect(cardValue('guard')).toBe(1);
    expect(cardValue('princess')).toBe(8);
  });

  it('defines tokens-to-win for each supported player count', () => {
    expect(TOKENS_TO_WIN).toEqual({ 2: 7, 3: 5, 4: 4 });
  });
});
