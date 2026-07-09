import { readFileSync } from 'node:fs';
import wordListPath from 'word-list';

// Bundled server-side dictionary — no live third-party API, per
// docs/a-little-wordy-rules.md's Implementation Notes. `word-list` is
// ~275k SCOWL-derived English words (Sindresorhus, Unlicense/public
// domain); loaded once into a Set at cold start for O(1) lookups rather
// than re-reading the file per call.
const WORDS = new Set(readFileSync(wordListPath, 'utf8').split('\n'));

export function isValidWord(word) {
  return typeof word === 'string' && WORDS.has(word.toLowerCase());
}
