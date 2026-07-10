// Side Effects card definitions + deck composition. Mirrors deck.js's
// pure-data-only role — no Admin SDK, no Firestore.
//
// 18 unique faces (17 real + a card-back, per the source spec): 8 Disorders,
// 7 Drugs (every Disorder except Anorexia, which is Therapy-only), 1 generic
// Episode, 1 generic Therapy, +2 Booster-only cards (Misdiagnosis, High
// Tolerance) gated behind the 'booster' ruleset.

export const DISORDERS = [
  'anxiety',
  'anorexia',
  'depression',
  'gamblingAddiction',
  'impotence',
  'madness',
  'suicidalThoughts',
  'tremors',
];

export const CARD_DEFS = {
  anxiety: { id: 'anxiety', type: 'disorder', name: 'Anxiety' },
  anorexia: { id: 'anorexia', type: 'disorder', name: 'Anorexia', noTreatment: true },
  depression: { id: 'depression', type: 'disorder', name: 'Depression' },
  gamblingAddiction: { id: 'gamblingAddiction', type: 'disorder', name: 'Gambling Addiction' },
  impotence: { id: 'impotence', type: 'disorder', name: 'Impotence' },
  madness: { id: 'madness', type: 'disorder', name: 'Madness' },
  suicidalThoughts: { id: 'suicidalThoughts', type: 'disorder', name: 'Suicidal Thoughts' },
  tremors: { id: 'tremors', type: 'disorder', name: 'Tremors', noTherapy: true },

  anxietyTreatment: {
    id: 'anxietyTreatment',
    type: 'drug',
    name: 'Anxiety Treatment',
    treats: 'anxiety',
    sideEffects: ['suicidalThoughts', 'depression', 'madness'],
  },
  depressionTreatment: {
    id: 'depressionTreatment',
    type: 'drug',
    name: 'Depression Treatment',
    treats: 'depression',
    sideEffects: ['impotence', 'suicidalThoughts', 'anorexia'],
  },
  gamblingAddictionTreatment: {
    id: 'gamblingAddictionTreatment',
    type: 'drug',
    name: 'Gambling Addiction Treatment',
    treats: 'gamblingAddiction',
    sideEffects: ['impotence'],
  },
  impotenceTreatment: {
    id: 'impotenceTreatment',
    type: 'drug',
    name: 'Impotence Treatment',
    treats: 'impotence',
    sideEffects: ['anxiety'],
  },
  madnessTreatment: {
    id: 'madnessTreatment',
    type: 'drug',
    name: 'Madness Treatment',
    treats: 'madness',
    sideEffects: ['tremors'],
  },
  suicidalThoughtsTreatment: {
    id: 'suicidalThoughtsTreatment',
    type: 'drug',
    name: 'Suicidal Thoughts Treatment',
    treats: 'suicidalThoughts',
    sideEffects: ['madness'],
  },
  tremorsTreatment: {
    id: 'tremorsTreatment',
    type: 'drug',
    name: 'Tremors Treatment',
    treats: 'tremors',
    sideEffects: ['gamblingAddiction', 'depression', 'madness'],
  },

  episode: { id: 'episode', type: 'episode', name: 'Episode' },
  therapy: { id: 'therapy', type: 'therapy', name: 'Therapy' },

  misdiagnosis: { id: 'misdiagnosis', type: 'booster', name: 'Misdiagnosis' },
  highTolerance: { id: 'highTolerance', type: 'booster', name: 'High Tolerance' },
};

const DRUG_IDS = Object.values(CARD_DEFS)
  .filter((c) => c.type === 'drug')
  .map((c) => c.id);

// Deck composition is a tuning default, not confirmed from an official
// source (same allowance the source rules doc gives other unconfirmed
// numbers) — sized generously enough to comfortably support up to 8 players
// without running a Disorder/Drug type dry early in a game.
const DISORDER_COUNTS = Object.fromEntries(DISORDERS.map((id) => [id, 6]));
const DRUG_COUNTS = Object.fromEntries(DRUG_IDS.map((id) => [id, 5]));
const BASE_COUNTS = { ...DISORDER_COUNTS, ...DRUG_COUNTS, episode: 10, therapy: 8 };

export const DECKS = {
  base: BASE_COUNTS,
  booster: { ...BASE_COUNTS, misdiagnosis: 3, highTolerance: 3 },
};

export function isValidRuleset(ruleset) {
  return ruleset === 'base' || ruleset === 'booster';
}

// 4 Disorders per player, or 3 at 6-8 players (per the rulebook).
export function psycheSizeForPlayerCount(n) {
  return n >= 6 ? 3 : 4;
}

// Flat array of Disorder cardId strings — dealt into Psyches first, per the
// rulebook's two-phase setup (Disorders are separated from the rest of the
// deck before shuffling/dealing).
export function buildDisorderPool(ruleset = 'base') {
  const counts = DECKS[ruleset];
  const pool = [];
  for (const id of DISORDERS) {
    for (let i = 0; i < counts[id]; i++) pool.push(id);
  }
  return pool;
}

// Flat array of every non-Disorder cardId (Drugs/Episode/Therapy/Booster) —
// combined with any leftover undealt Disorders before shuffling and dealing
// hands.
export function buildNonDisorderDeck(ruleset = 'base') {
  const counts = DECKS[ruleset];
  const deck = [];
  for (const [id, count] of Object.entries(counts)) {
    if (DISORDERS.includes(id)) continue;
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

export function cardName(cardId) {
  return CARD_DEFS[cardId]?.name || cardId;
}

export function cardType(cardId) {
  return CARD_DEFS[cardId]?.type;
}
