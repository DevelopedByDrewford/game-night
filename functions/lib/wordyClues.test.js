import { describe, it, expect } from 'vitest';
import { VANILLA_CLUES, SPICY_CLUES, ALL_CLUES, CLUE_DEFS, selectCluePool } from './wordyClues.js';

function identityShuffle(array) {
  return array.slice();
}

describe('clue definitions', () => {
  it('has exactly 6 Vanilla and 10 Spicy clues, matching the rules doc pool-draw counts', () => {
    expect(VANILLA_CLUES).toHaveLength(6);
    expect(SPICY_CLUES).toHaveLength(10);
    expect(ALL_CLUES).toHaveLength(16);
  });

  it('has no duplicate ids', () => {
    const ids = ALL_CLUES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('indexes every clue by id in CLUE_DEFS', () => {
    for (const clue of ALL_CLUES) {
      expect(CLUE_DEFS[clue.id]).toBe(clue);
    }
  });
});

describe('selectCluePool', () => {
  it('picks 4 Vanilla + 4 Spicy ids (8 total, all unique)', () => {
    const pool = selectCluePool(identityShuffle);
    expect(pool).toHaveLength(8);
    expect(new Set(pool).size).toBe(8);

    const vanillaIds = new Set(VANILLA_CLUES.map((c) => c.id));
    const spicyIds = new Set(SPICY_CLUES.map((c) => c.id));
    const vanillaInPool = pool.filter((id) => vanillaIds.has(id));
    const spicyInPool = pool.filter((id) => spicyIds.has(id));
    expect(vanillaInPool).toHaveLength(4);
    expect(spicyInPool).toHaveLength(4);
  });

  it('calls the provided shuffle function (not a fixed order)', () => {
    let calls = 0;
    const countingShuffle = (arr) => {
      calls += 1;
      return arr.slice().reverse();
    };
    selectCluePool(countingShuffle);
    expect(calls).toBe(2); // once for vanilla ids, once for spicy ids
  });
});
