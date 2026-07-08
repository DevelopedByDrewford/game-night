import { describe, it, expect } from 'vitest';
import { buildDeck, bracketForPlayerCount, isValidRulesetForPlayerCount, cardValue, TOKENS_TO_WIN } from './deck.js';

describe('buildDeck', () => {
  it('builds the standard 16-card classic deck for 2-4 players', () => {
    for (const count of [2, 3, 4]) {
      const deck = buildDeck(count, 'classic');
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

  it('defaults to classic when no ruleset is given', () => {
    expect(buildDeck(3)).toHaveLength(16);
  });

  it('builds the 21-card extended deck for 5-6 players (also playable at 2-4)', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const deck = buildDeck(count, 'extended');
      expect(deck).toHaveLength(21);
      expect(deck.filter((c) => c === 'spy')).toHaveLength(2);
      expect(deck.filter((c) => c === 'guard')).toHaveLength(6);
      expect(deck.filter((c) => c === 'chancellor')).toHaveLength(2);
      expect(deck.filter((c) => c === 'king')).toHaveLength(1);
      expect(deck.filter((c) => c === 'countess')).toHaveLength(1);
      expect(deck.filter((c) => c === 'princess')).toHaveLength(1);
    }
  });

  it('rejects classic ruleset for 5-6 players (deck cannot seat that many)', () => {
    expect(() => buildDeck(5, 'classic')).toThrow();
    expect(() => buildDeck(6, 'classic')).toThrow();
  });

  it('rejects unsupported player counts for either ruleset', () => {
    expect(() => buildDeck(1, 'classic')).toThrow();
    expect(() => buildDeck(7, 'extended')).toThrow();
    expect(bracketForPlayerCount(1)).toBeNull();
    expect(bracketForPlayerCount(7)).toBeNull();
  });

  it('has ascending card values matching name order, with room for spy/chancellor', () => {
    expect(cardValue('spy')).toBe(0);
    expect(cardValue('guard')).toBe(1);
    expect(cardValue('chancellor')).toBe(6);
    expect(cardValue('king')).toBe(7);
    expect(cardValue('countess')).toBe(8);
    expect(cardValue('princess')).toBe(9);
  });

  it('defines tokens-to-win for each supported player count', () => {
    expect(TOKENS_TO_WIN).toEqual({ 2: 7, 3: 5, 4: 4, 5: 4, 6: 4 });
  });

  it('bracketForPlayerCount returns the default ruleset for a given count', () => {
    expect(bracketForPlayerCount(2)).toBe('classic');
    expect(bracketForPlayerCount(4)).toBe('classic');
    expect(bracketForPlayerCount(5)).toBe('extended');
    expect(bracketForPlayerCount(6)).toBe('extended');
  });

  it('isValidRulesetForPlayerCount enforces each ruleset\'s valid range', () => {
    expect(isValidRulesetForPlayerCount('classic', 4)).toBe(true);
    expect(isValidRulesetForPlayerCount('classic', 5)).toBe(false);
    expect(isValidRulesetForPlayerCount('extended', 2)).toBe(true);
    expect(isValidRulesetForPlayerCount('extended', 6)).toBe(true);
    expect(isValidRulesetForPlayerCount('extended', 7)).toBe(false);
    expect(isValidRulesetForPlayerCount('bogus', 4)).toBe(false);
  });
});
