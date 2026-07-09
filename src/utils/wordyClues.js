// Frontend copy of the clue metadata in functions/lib/wordyClues.js —
// display only. Descriptions are copied verbatim from
// docs/a-little-wordy-rules.md's Clue table (the source of truth for effect
// wording); don't reword them here, edit the doc and re-copy instead.
// Duplicated rather than shared for the same reason as src/utils/cards.js:
// functions/ is a separate deployable, not part of the Vite-bundled src tree.
export const CLUE_DEFS = {
  'last-letter': {
    id: 'last-letter',
    category: 'vanilla',
    title: 'Last Letter',
    value: 1,
    description: 'Opponent reveals the last letter of their Secret Word.',
  },
  'relative-word-length': {
    id: 'relative-word-length',
    category: 'vanilla',
    title: 'Relative Word Length',
    value: 1,
    description:
      "Build a valid word from your tiles; opponent tells you whether their Secret Word is longer, shorter, or the same length.",
  },
  'letter-strike': {
    id: 'letter-strike',
    category: 'vanilla',
    title: 'Letter Strike',
    value: 2,
    description: "Choose a letter from your tile set; opponent tells you if it's in their Secret Word.",
  },
  'exact-word-length': {
    id: 'exact-word-length',
    category: 'vanilla',
    title: 'Exact Word Length',
    value: 3,
    description: 'Opponent reveals the exact length of their Secret Word.',
  },
  'word-builder': {
    id: 'word-builder',
    category: 'vanilla',
    title: 'Word Builder',
    value: 4,
    description:
      'Build a valid word from your tiles; opponent flips face-down every tile in that word that does not appear in their Secret Word. Duplicate letters are treated separately.',
  },
  'first-letter': {
    id: 'first-letter',
    category: 'vanilla',
    title: 'First Letter',
    value: 4,
    description: 'Opponent reveals the first letter of their Secret Word.',
  },
  'lets-share': {
    id: 'lets-share',
    category: 'spicy',
    title: "Let's Share",
    value: 1,
    description:
      'Choose a letter present in both tile sets; both players reveal how many times it appears in their own Secret Word. Disabled once your opponent has already correctly guessed your word.',
  },
  'rare-find': {
    id: 'rare-find',
    category: 'spicy',
    title: 'Rare Find',
    value: 1,
    description: "Pick one of Z/J/Q/X/K; opponent tells you if it's in their Secret Word.",
  },
  'buy-a-vowel': {
    id: 'buy-a-vowel',
    category: 'spicy',
    title: 'Buy a Vowel',
    value: 1,
    description: "Opponent reveals a not-yet-revealed vowel tile in their Secret Word (or tells you none remain).",
  },
  'give-and-take': {
    id: 'give-and-take',
    category: 'spicy',
    title: 'Give and Take',
    value: 1,
    description:
      'Both players each reveal one not-yet-revealed letter tile from their own Secret Word. Duplicates treated separately. Disabled once your opponent has already correctly guessed your word.',
  },
  'burn-the-copies': {
    id: 'burn-the-copies',
    category: 'spicy',
    title: 'Burn the Copies',
    value: 2,
    description: "Choose a letter appearing at least twice in your tile set; opponent tells you how many times it's in their Secret Word.",
  },
  'vowel-count': {
    id: 'vowel-count',
    category: 'spicy',
    title: 'Vowel Count',
    value: 2,
    description: 'Opponent reveals the number of vowel tiles in their Secret Word.',
  },
  'consonant-count': {
    id: 'consonant-count',
    category: 'spicy',
    title: 'Consonant Count',
    value: 3,
    description: 'Opponent reveals the number of consonant tiles in their Secret Word.',
  },
  'super-strike': {
    id: 'super-strike',
    category: 'spicy',
    title: 'Super Strike',
    value: 3,
    description:
      "Choose a letter from your tile set; opponent tells you if it's in their Secret Word, and if so, also reveals the position of one instance.",
  },
  'rhyme-time': {
    id: 'rhyme-time',
    category: 'spicy',
    title: 'Rhyme Time',
    value: 5,
    description: 'Opponent says a valid word that rhymes with their Secret Word (or invents one if none exists).',
  },
  'dynamic-word-builder': {
    id: 'dynamic-word-builder',
    category: 'spicy',
    title: 'Dynamic Word Builder',
    value: null,
    description:
      'Build a valid word from your tiles; opponent flips face-down every tile that does not appear in their Secret Word (duplicates separate). Value = number of tiles that remain face-up.',
  },
};

export const CLUE_ORDER = [
  'last-letter',
  'relative-word-length',
  'letter-strike',
  'exact-word-length',
  'word-builder',
  'first-letter',
  'lets-share',
  'rare-find',
  'buy-a-vowel',
  'give-and-take',
  'burn-the-copies',
  'vowel-count',
  'consonant-count',
  'super-strike',
  'rhyme-time',
  'dynamic-word-builder',
];

export function clueTitle(clueId) {
  return CLUE_DEFS[clueId]?.title || clueId;
}

export function clueDescription(clueId) {
  return CLUE_DEFS[clueId]?.description || '';
}
