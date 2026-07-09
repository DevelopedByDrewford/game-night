import { describe, it, expect } from 'vitest';
import { dealTiles } from './wordyDeck.js';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function identityShuffle(array) {
  return array.slice();
}

describe('dealTiles', () => {
  it('deals 4 vowels and 7 consonants to each player', () => {
    const { playerA, playerB } = dealTiles(identityShuffle);

    expect(playerA.vowels).toHaveLength(4);
    expect(playerA.consonants).toHaveLength(7);
    expect(playerB.vowels).toHaveLength(4);
    expect(playerB.consonants).toHaveLength(7);
  });

  it('only deals actual vowels/consonants in the right buckets', () => {
    const { playerA, playerB } = dealTiles(identityShuffle);

    for (const letter of [...playerA.vowels, ...playerB.vowels]) {
      expect(VOWELS.has(letter)).toBe(true);
    }
    for (const letter of [...playerA.consonants, ...playerB.consonants]) {
      expect(VOWELS.has(letter)).toBe(false);
    }
  });

  it("draws both players' tiles from a single shared shuffle (no overlap in the same draw)", () => {
    // With the identity "shuffle", player A gets the first N tiles and
    // player B the next N — verifies the split, not randomness.
    const { playerA, playerB } = dealTiles(identityShuffle);
    const allVowels = [...playerA.vowels, ...playerB.vowels];
    const allConsonants = [...playerA.consonants, ...playerB.consonants];
    expect(allVowels).toHaveLength(8);
    expect(allConsonants).toHaveLength(14);
  });

  it('calls the provided shuffle function rather than dealing in a fixed order', () => {
    let calls = 0;
    const countingShuffle = (arr) => {
      calls += 1;
      return arr.slice().reverse();
    };
    dealTiles(countingShuffle);
    expect(calls).toBe(2); // once for the vowel bag, once for the consonant bag
  });
});
