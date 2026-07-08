// Frontend copy of the card definitions in functions/lib/deck.js — display
// only (name/value/deck composition for rendering hands, the guess picker,
// and the rules reference). Duplicated rather than shared because functions/
// is a separate deployable with its own module resolution, not part of the
// Vite-bundled src tree.
export const CARD_DEFS = {
  spy: {
    id: 'spy',
    name: 'Spy',
    value: 0,
    description:
      "If you're the only player who played or discarded a Spy this round, gain 1 Favor Token at the end of the round.",
  },
  guard: {
    id: 'guard',
    name: 'Guard',
    value: 1,
    description: 'Name a non-Guard card and choose another player. If they hold that card, they are eliminated.',
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    value: 2,
    description: "Secretly look at another player's hand.",
  },
  baron: {
    id: 'baron',
    name: 'Baron',
    value: 3,
    description: 'Compare hands with another player. The lower-value hand is eliminated.',
  },
  handmaid: {
    id: 'handmaid',
    name: 'Handmaid',
    value: 4,
    description: "You can't be targeted by other players until your next turn.",
  },
  prince: {
    id: 'prince',
    name: 'Prince',
    value: 5,
    description:
      'Choose any player (including yourself). They discard their hand and draw a replacement. If they discarded the Princess, they are eliminated.',
  },
  chancellor: {
    id: 'chancellor',
    name: 'Chancellor',
    value: 6,
    description: 'Draw two cards, keep one, and place the other two on the bottom of the deck in any order.',
  },
  king: {
    id: 'king',
    name: 'King',
    value: 7,
    description: 'Trade hands with another player.',
  },
  countess: {
    id: 'countess',
    name: 'Countess',
    value: 8,
    description: 'If you also hold the King or Prince, you must play the Countess.',
  },
  princess: {
    id: 'princess',
    name: 'Princess',
    value: 9,
    description: 'If you discard the Princess for any reason, you are eliminated.',
  },
};

// Ascending value order — used to render the rules reference in a stable,
// scannable order (matches the physical card ranks).
export const CARD_ORDER = [
  'spy',
  'guard',
  'priest',
  'baron',
  'handmaid',
  'prince',
  'chancellor',
  'king',
  'countess',
  'princess',
];

// Deck composition per ruleset — mirrors functions/lib/deck.js's DECKS.
// Used to compute each card's "Copies" count in the rules reference, scoped
// to whichever ruleset the current game is actually using.
export const DECKS = {
  classic: { guard: 5, priest: 2, baron: 2, handmaid: 2, prince: 2, king: 1, countess: 1, princess: 1 },
  extended: {
    spy: 2,
    guard: 6,
    priest: 2,
    baron: 2,
    handmaid: 2,
    prince: 2,
    chancellor: 2,
    king: 1,
    countess: 1,
    princess: 1,
  },
};

export const TARGETED_CARDS = ['guard', 'priest', 'baron', 'king', 'prince'];

export function cardName(cardId) {
  return CARD_DEFS[cardId]?.name || cardId;
}

export function cardDescription(cardId) {
  return CARD_DEFS[cardId]?.description || '';
}
