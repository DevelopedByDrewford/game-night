// Scrabble-style letter frequency distribution — a placeholder
// approximation since no official A Little Wordy tile distribution is
// published anywhere findable (see docs/a-little-wordy-rules.md's
// Implementation Notes: "needs to be sourced or approximated... before
// dealTiles can be implemented for real"). Counts are the standard English
// Scrabble tile distribution (100 tiles minus the 2 blanks, which have no
// letter-frequency meaning here). Revisit if a real distribution surfaces.
const VOWEL_FREQUENCIES = { A: 9, E: 12, I: 9, O: 8, U: 4 };
const CONSONANT_FREQUENCIES = {
  B: 2, C: 2, D: 4, F: 2, G: 3, H: 2, J: 1, K: 1, L: 4, M: 2,
  N: 6, P: 2, Q: 1, R: 6, S: 4, T: 6, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

const VOWELS_PER_PLAYER = 4;
const CONSONANTS_PER_PLAYER = 7;

function expandBag(frequencies) {
  return Object.entries(frequencies).flatMap(([letter, count]) => Array(count).fill(letter));
}

// shuffle: functions/lib/shuffle.js's shuffle(array) (already generic,
// reused as-is). Draws from one shared bag per letter type, not
// independent per-player bags — matches how a physical tile bag works,
// same "shuffle once, slice per player" pattern as Love Letter's single
// shared deck (functions/lib/rules.js#dealSetup).
export function dealTiles(shuffle) {
  const vowelDraw = shuffle(expandBag(VOWEL_FREQUENCIES));
  const consonantDraw = shuffle(expandBag(CONSONANT_FREQUENCIES));

  const vowels = vowelDraw.slice(0, VOWELS_PER_PLAYER * 2);
  const consonants = consonantDraw.slice(0, CONSONANTS_PER_PLAYER * 2);

  return {
    playerA: {
      vowels: vowels.slice(0, VOWELS_PER_PLAYER),
      consonants: consonants.slice(0, CONSONANTS_PER_PLAYER),
    },
    playerB: {
      vowels: vowels.slice(VOWELS_PER_PLAYER),
      consonants: consonants.slice(CONSONANTS_PER_PLAYER),
    },
  };
}
