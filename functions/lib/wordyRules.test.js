import { describe, it, expect } from 'vitest';
import { isSpellable, resolveClue, checkAndMaybeCompleteGame } from './wordyRules.js';

const firstOf = (array) => array[0];

function makeCtx(overrides = {}) {
  return {
    callerUid: 'alice',
    callerName: 'Alice',
    opponentUid: 'bob',
    opponentName: 'Bob',
    // Alice's secretWord ("PLAN") is spellable from her own originalTiles;
    // Bob's ("CAB") from his. After the swap, each player's tilesInFront
    // holds the OTHER player's originalTiles — Alice ends up looking at
    // Bob's letters (and vice versa), which is what she guesses against.
    callerHand: {
      originalTiles: { vowels: ['A', 'E', 'I', 'O'], consonants: ['P', 'L', 'N', 'S', 'T', 'M', 'R'] },
      tilesInFront: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
      secretWord: 'PLAN',
    },
    opponentHand: {
      originalTiles: { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] },
      tilesInFront: { vowels: ['A', 'E', 'I', 'O'], consonants: ['P', 'L', 'N', 'S', 'T', 'M', 'R'] },
      secretWord: 'CAB',
    },
    revealedForCaller: [],
    revealedForOpponent: [],
    args: {},
    pickRandom: firstOf,
    ...overrides,
  };
}

describe('isSpellable', () => {
  it('allows a word buildable from the tiles', () => {
    expect(isSpellable('cab', { vowels: ['A'], consonants: ['C', 'B'] })).toBe(true);
  });

  it('rejects a word needing a letter not present', () => {
    expect(isSpellable('cat', { vowels: ['A'], consonants: ['C', 'B'] })).toBe(false);
  });

  it('respects duplicate-letter counts', () => {
    expect(isSpellable('ebb', { vowels: ['E'], consonants: ['B'] })).toBe(false);
    expect(isSpellable('ebb', { vowels: ['E'], consonants: ['B', 'B'] })).toBe(true);
  });
});

describe('resolveClue', () => {
  it('last-letter reveals the last letter, awards 1 token', () => {
    const result = resolveClue('last-letter', makeCtx());
    expect(result.tokensAwarded).toBe(1);
    expect(result.logMessage).toContain('"B"'); // opponent secretWord 'CAB'
  });

  it('first-letter reveals the first letter, awards 4 tokens', () => {
    const result = resolveClue('first-letter', makeCtx());
    expect(result.tokensAwarded).toBe(4);
    expect(result.logMessage).toContain('"C"');
  });

  it('exact-word-length reveals the length, awards 3 tokens', () => {
    const result = resolveClue('exact-word-length', makeCtx());
    expect(result.tokensAwarded).toBe(3);
    expect(result.logMessage).toContain('3 letters');
  });

  it('vowel-count / consonant-count count correctly', () => {
    // opponent secretWord 'CAB' — 1 vowel (A), 2 consonants (C, B)
    expect(resolveClue('vowel-count', makeCtx()).logMessage).toContain('1 vowel');
    expect(resolveClue('consonant-count', makeCtx()).logMessage).toContain('2 consonants');
  });

  it('relative-word-length rejects an unbuildable/invalid word', () => {
    expect(() => resolveClue('relative-word-length', makeCtx({ args: { builtWord: 'xyz' } }))).toThrow();
  });

  it('relative-word-length compares lengths for a legal built word', () => {
    // caller's tilesInFront (post-swap) is A/E/I/O + C/B/D/F/G/H/J — "cage"
    // is spellable and a real word, 4 letters vs opponent's "CAB" (3)
    const result = resolveClue('relative-word-length', makeCtx({ args: { builtWord: 'cage' } }));
    expect(result.tokensAwarded).toBe(1);
    expect(result.logMessage).toContain('longer');
  });

  it('letter-strike rejects a letter not in the caller\'s tile set', () => {
    expect(() => resolveClue('letter-strike', makeCtx({ args: { letter: 'Z' } }))).toThrow();
  });

  it('letter-strike reports presence correctly', () => {
    const present = resolveClue('letter-strike', makeCtx({ args: { letter: 'A' } })); // caller has A, opponent word CAB has A
    expect(present.logMessage).toContain('it is in');
    const absent = resolveClue('letter-strike', makeCtx({ args: { letter: 'D' } })); // caller has D, opponent word CAB doesn't
    expect(absent.logMessage).toContain("it isn't in");
  });

  it('word-builder flips down letters absent from the opponent word, counting duplicates separately', () => {
    // opponent secretWord 'CAB'; caller builds "bad" from tilesInFront —
    // B and A are present in CAB, D is not, so D should flip face-down
    const result = resolveClue('word-builder', makeCtx({ args: { builtWord: 'bad' } }));
    expect(result.tokensAwarded).toBe(4);
    expect(result.logMessage).toContain('flipped face-down: D');
  });

  it("lets-share requires the letter present in both tile sets", () => {
    expect(() => resolveClue('lets-share', makeCtx({ args: { letter: 'Z' } }))).toThrow();
    const result = resolveClue('lets-share', makeCtx({ args: { letter: 'A' } }));
    expect(result.tokensAwarded).toBe(1);
    expect(result.logMessage).toContain('Alice: 1'); // 'PLAN' has one A
    expect(result.logMessage).toContain('Bob: 1'); // 'CAB' has one A
  });

  it('rare-find only accepts Z/J/Q/X/K', () => {
    expect(() => resolveClue('rare-find', makeCtx({ args: { letter: 'A' } }))).toThrow();
    const result = resolveClue('rare-find', makeCtx({ args: { letter: 'J' } }));
    expect(result.logMessage).toContain("it isn't in");
  });

  it('buy-a-vowel reveals an unrevealed vowel position and patches revealed state', () => {
    // opponent secretWord 'CAB' — vowel at index 1 ('A')
    const result = resolveClue('buy-a-vowel', makeCtx());
    expect(result.tokensAwarded).toBe(1);
    expect(result.revealedPatch).toEqual({ bob: [1] });
    expect(result.logMessage).toContain('"A"');
  });

  it('buy-a-vowel reports none remaining once the only vowel is already revealed', () => {
    const result = resolveClue('buy-a-vowel', makeCtx({ revealedForOpponent: [1] }));
    expect(result.revealedPatch).toBeUndefined();
    expect(result.logMessage).toContain('no unrevealed vowels remain');
  });

  it('give-and-take reveals one unrevealed tile from each player', () => {
    const result = resolveClue('give-and-take', makeCtx());
    expect(result.revealedPatch.alice).toHaveLength(1);
    expect(result.revealedPatch.bob).toHaveLength(1);
  });

  it('burn-the-copies requires the letter to appear twice in the caller\'s tile set', () => {
    expect(() => resolveClue('burn-the-copies', makeCtx({ args: { letter: 'A' } }))).toThrow(); // caller has only one A
    const ctx = makeCtx({
      callerHand: {
        ...makeCtx().callerHand,
        tilesInFront: { vowels: ['A', 'A'], consonants: [] },
      },
      opponentHand: { ...makeCtx().opponentHand, secretWord: 'AARDVARK' },
      args: { letter: 'A' },
    });
    const result = resolveClue('burn-the-copies', ctx);
    expect(result.tokensAwarded).toBe(2);
    expect(result.logMessage).toContain('3 times');
  });

  it('super-strike reveals presence and, if present, a position', () => {
    const result = resolveClue('super-strike', makeCtx({ args: { letter: 'A' } }));
    expect(result.revealedPatch).toEqual({ bob: [1] });
    expect(result.logMessage).toContain('position 2');
  });

  it('dynamic-word-builder awards tokens equal to the face-up (matched) tile count', () => {
    // "bad" vs opponent secretWord 'CAB' — B and A match (face-up), D doesn't
    const result = resolveClue('dynamic-word-builder', makeCtx({ args: { builtWord: 'bad' } }));
    expect(result.tokensAwarded).toBe(2);
  });

  it('throws for an unknown clue id', () => {
    expect(() => resolveClue('not-a-real-clue', makeCtx())).toThrow();
  });
});

describe('checkAndMaybeCompleteGame', () => {
  const baseState = { turnOrder: ['alice', 'bob'] };

  it('returns null when neither word has been guessed yet', () => {
    const state = { ...baseState, tokens: { alice: 5, bob: 0 }, guessedCorrectly: {} };
    expect(checkAndMaybeCompleteGame(state)).toBeNull();
  });

  it('declares the guesser the winner if strictly ahead at the moment of a correct guess', () => {
    // alice just guessed bob's word; alice is ahead
    const state = { ...baseState, tokens: { alice: 5, bob: 2 }, guessedCorrectly: { bob: true } };
    expect(checkAndMaybeCompleteGame(state)).toEqual({ phase: 'completed', winnerUid: 'alice' });
  });

  it('does not declare a winner if tied or behind after a correct guess', () => {
    const tied = { ...baseState, tokens: { alice: 3, bob: 3 }, guessedCorrectly: { bob: true } };
    expect(checkAndMaybeCompleteGame(tied)).toBeNull();
    const behind = { ...baseState, tokens: { alice: 1, bob: 3 }, guessedCorrectly: { bob: true } };
    expect(checkAndMaybeCompleteGame(behind)).toBeNull();
  });

  it('declares a winner once a previously-tied-or-behind guesser pulls ahead via later clue tokens', () => {
    const state = { ...baseState, tokens: { alice: 4, bob: 3 }, guessedCorrectly: { bob: true } };
    expect(checkAndMaybeCompleteGame(state)).toEqual({ phase: 'completed', winnerUid: 'alice' });
  });

  it('moves to tiebreaker once both words are guessed and tokens are exactly tied', () => {
    const state = { ...baseState, tokens: { alice: 4, bob: 4 }, guessedCorrectly: { alice: true, bob: true } };
    expect(checkAndMaybeCompleteGame(state)).toEqual({ phase: 'tiebreaker' });
  });
});
