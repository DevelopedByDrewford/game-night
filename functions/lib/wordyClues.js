// Clue metadata only — id/category/title/value. Effect *text* is NOT
// duplicated here; docs/a-little-wordy-rules.md's Clue table is the
// authoritative source for what each clue does. Effect *resolution logic*
// (necessarily executable, not prose) lives in wordyRules.js — one
// resolver function per id below.
export const VANILLA_CLUES = [
  { id: 'last-letter', category: 'vanilla', title: 'Last Letter', value: 1 },
  { id: 'relative-word-length', category: 'vanilla', title: 'Relative Word Length', value: 1 },
  { id: 'letter-strike', category: 'vanilla', title: 'Letter Strike', value: 2 },
  { id: 'exact-word-length', category: 'vanilla', title: 'Exact Word Length', value: 3 },
  { id: 'word-builder', category: 'vanilla', title: 'Word Builder', value: 4 },
  { id: 'first-letter', category: 'vanilla', title: 'First Letter', value: 4 },
];

export const SPICY_CLUES = [
  { id: 'lets-share', category: 'spicy', title: "Let's Share", value: 1 },
  { id: 'rare-find', category: 'spicy', title: 'Rare Find', value: 1 },
  { id: 'buy-a-vowel', category: 'spicy', title: 'Buy a Vowel', value: 1 },
  { id: 'give-and-take', category: 'spicy', title: 'Give and Take', value: 1 },
  { id: 'burn-the-copies', category: 'spicy', title: 'Burn the Copies', value: 2 },
  { id: 'vowel-count', category: 'spicy', title: 'Vowel Count', value: 2 },
  { id: 'consonant-count', category: 'spicy', title: 'Consonant Count', value: 3 },
  { id: 'super-strike', category: 'spicy', title: 'Super Strike', value: 3 },
  { id: 'rhyme-time', category: 'spicy', title: 'Rhyme Time', value: 5 },
  // value: null — "Value = number of tiles that remain face-up", computed
  // dynamically at resolution time, not fixed. See wordyRules.js.
  { id: 'dynamic-word-builder', category: 'spicy', title: 'Dynamic Word Builder', value: null },
];

export const ALL_CLUES = [...VANILLA_CLUES, ...SPICY_CLUES];
export const CLUE_DEFS = Object.fromEntries(ALL_CLUES.map((c) => [c.id, c]));

const VANILLA_POOL_SIZE = 4;
const SPICY_POOL_SIZE = 4;

// Randomly draws the game's 8-card shared pool: 4 of 6 Vanilla, 4 of 10
// Spicy (docs/a-little-wordy-rules.md's Setup section). shuffle:
// functions/lib/shuffle.js's shuffle(array).
export function selectCluePool(shuffle) {
  const vanilla = shuffle(VANILLA_CLUES.map((c) => c.id)).slice(0, VANILLA_POOL_SIZE);
  const spicy = shuffle(SPICY_CLUES.map((c) => c.id)).slice(0, SPICY_POOL_SIZE);
  return [...vanilla, ...spicy];
}
