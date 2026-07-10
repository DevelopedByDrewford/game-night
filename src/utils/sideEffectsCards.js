// Frontend copy of functions/lib/sideEffectsDeck.js's card metadata —
// display + target-picker filtering only, duplicated rather than shared
// because functions/ is a separate deployable with its own module
// resolution (same reason src/utils/cards.js duplicates deck.js).

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
  anorexia: { id: 'anorexia', type: 'disorder', name: 'Anorexia' },
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

export function cardName(cardId) {
  return CARD_DEFS[cardId]?.name || cardId;
}

export function cardType(cardId) {
  return CARD_DEFS[cardId]?.type;
}

// Disorder ids a psyche is currently vulnerable to receiving — the union of
// every active Drug's side-effect list. Mirrors
// functions/lib/sideEffectsRules.js#vulnerableDisorders — used here only to
// filter the Give-a-Disorder target picker to plausible targets; the server
// is still the source of truth for legality.
export function vulnerableDisorders(psyche) {
  const set = new Set();
  for (const entry of psyche || []) {
    if (!entry.drugId) continue;
    for (const sideEffect of CARD_DEFS[entry.drugId].sideEffects) set.add(sideEffect);
  }
  return set;
}
