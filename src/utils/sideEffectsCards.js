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
  anxiety: {
    id: 'anxiety',
    type: 'disorder',
    name: 'Anxiety',
    description: "If hit with Episode: the inflictor may take 1 card from your revealed hand.",
  },
  anorexia: {
    id: 'anorexia',
    type: 'disorder',
    name: 'Anorexia',
    description:
      "If hit with Episode: you don't draw on your next turn. Can only be cured with Therapy — no Drug treats it.",
  },
  depression: {
    id: 'depression',
    type: 'disorder',
    name: 'Depression',
    description: 'If hit with Episode: you sit out your entire next turn — no draw, no play.',
  },
  gamblingAddiction: {
    id: 'gamblingAddiction',
    type: 'disorder',
    name: 'Gambling Addiction',
    description: 'If hit with Episode: the inflictor draws 3 random cards from your hand.',
  },
  impotence: {
    id: 'impotence',
    type: 'disorder',
    name: 'Impotence',
    description: "If hit with Episode: you draw normally but can't play any card on your next turn.",
  },
  madness: {
    id: 'madness',
    type: 'disorder',
    name: 'Madness',
    description: 'If hit with Episode: discard every Drug currently on your Psyche.',
  },
  suicidalThoughts: {
    id: 'suicidalThoughts',
    type: 'disorder',
    name: 'Suicidal Thoughts',
    description: 'If hit with Episode: discard your entire hand.',
  },
  tremors: {
    id: 'tremors',
    type: 'disorder',
    name: 'Tremors',
    noTherapy: true,
    description:
      'If hit with Episode: discard 3 random cards (or your whole hand if you hold fewer than 3). Immune to Therapy — needs its own Treatment.',
  },

  anxietyTreatment: {
    id: 'anxietyTreatment',
    type: 'drug',
    name: 'Anxiety Treatment',
    treats: 'anxiety',
    sideEffects: ['suicidalThoughts', 'depression', 'madness'],
    description: 'Treats Anxiety. May expose you to: Suicidal Thoughts, Depression, Madness.',
  },
  depressionTreatment: {
    id: 'depressionTreatment',
    type: 'drug',
    name: 'Depression Treatment',
    treats: 'depression',
    sideEffects: ['impotence', 'suicidalThoughts', 'anorexia'],
    description: 'Treats Depression. May expose you to: Impotence, Suicidal Thoughts, Anorexia.',
  },
  gamblingAddictionTreatment: {
    id: 'gamblingAddictionTreatment',
    type: 'drug',
    name: 'Gambling Addiction Treatment',
    treats: 'gamblingAddiction',
    sideEffects: ['impotence'],
    description: 'Treats Gambling Addiction. May expose you to: Impotence.',
  },
  impotenceTreatment: {
    id: 'impotenceTreatment',
    type: 'drug',
    name: 'Impotence Treatment',
    treats: 'impotence',
    sideEffects: ['anxiety'],
    description: 'Treats Impotence. May expose you to: Anxiety.',
  },
  madnessTreatment: {
    id: 'madnessTreatment',
    type: 'drug',
    name: 'Madness Treatment',
    treats: 'madness',
    sideEffects: ['tremors'],
    description: 'Treats Madness. May expose you to: Tremors.',
  },
  suicidalThoughtsTreatment: {
    id: 'suicidalThoughtsTreatment',
    type: 'drug',
    name: 'Suicidal Thoughts Treatment',
    treats: 'suicidalThoughts',
    sideEffects: ['madness'],
    description: 'Treats Suicidal Thoughts. May expose you to: Madness.',
  },
  tremorsTreatment: {
    id: 'tremorsTreatment',
    type: 'drug',
    name: 'Tremors Treatment',
    treats: 'tremors',
    sideEffects: ['gamblingAddiction', 'depression', 'madness'],
    description: 'Treats Tremors. May expose you to: Gambling Addiction, Depression, Madness.',
  },

  episode: {
    id: 'episode',
    type: 'episode',
    name: 'Episode',
    description: "Trigger the punishment printed on an opponent's untreated Disorder.",
  },
  therapy: {
    id: 'therapy',
    type: 'therapy',
    name: 'Therapy',
    description: 'Discard any Disorder from your Psyche (except Tremors), along with this card.',
  },

  misdiagnosis: {
    id: 'misdiagnosis',
    type: 'booster',
    name: 'Misdiagnosis',
    description:
      'Swap one Disorder in your Psyche with one Disorder card in your hand. You may keep the swapped-out Disorder in hand.',
  },
  highTolerance: {
    id: 'highTolerance',
    type: 'booster',
    name: 'High Tolerance',
    description: "Remove a Drug from another player's Psyche, un-treating that Disorder.",
  },
};

export function cardName(cardId) {
  return CARD_DEFS[cardId]?.name || cardId;
}

export function cardType(cardId) {
  return CARD_DEFS[cardId]?.type;
}

export function cardDescription(cardId) {
  return CARD_DEFS[cardId]?.description || '';
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
