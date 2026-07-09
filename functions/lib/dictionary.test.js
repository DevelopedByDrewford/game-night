import { describe, it, expect } from 'vitest';
import { isValidWord } from './dictionary.js';

describe('isValidWord', () => {
  it('accepts common real words', () => {
    expect(isValidWord('cat')).toBe(true);
    expect(isValidWord('house')).toBe(true);
    expect(isValidWord('wordy')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidWord('CAT')).toBe(true);
    expect(isValidWord('Cat')).toBe(true);
  });

  it('rejects gibberish and non-words', () => {
    expect(isValidWord('zzxxqq')).toBe(false);
    expect(isValidWord('qwertyzxcvbn')).toBe(false);
  });

  it('rejects empty/non-string input without throwing', () => {
    expect(isValidWord('')).toBe(false);
    expect(isValidWord(null)).toBe(false);
    expect(isValidWord(undefined)).toBe(false);
    expect(isValidWord(123)).toBe(false);
  });
});
