// Two Love Letter decks, keyed by ruleset: 'classic' (the original 16-card
// 2-4 player game) and 'extended' (the 2019 2nd-edition 21-card deck that
// adds Spy/Chancellor/a 6th Guard to support 5-6 players). Values are shared
// across both — only relative order matters anywhere in the rules engine
// (Baron compares, round-end tiebreaks), so classic games are unaffected by
// leaving a gap at the Spy/Chancellor slots.
export const CARD_DEFS = {
  spy: { id: 'spy', name: 'Spy', value: 0 },
  guard: { id: 'guard', name: 'Guard', value: 1 },
  priest: { id: 'priest', name: 'Priest', value: 2 },
  baron: { id: 'baron', name: 'Baron', value: 3 },
  handmaid: { id: 'handmaid', name: 'Handmaid', value: 4 },
  prince: { id: 'prince', name: 'Prince', value: 5 },
  chancellor: { id: 'chancellor', name: 'Chancellor', value: 6 },
  king: { id: 'king', name: 'King', value: 7 },
  countess: { id: 'countess', name: 'Countess', value: 8 },
  princess: { id: 'princess', name: 'Princess', value: 9 },
};

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

export const TOKENS_TO_WIN = { 2: 7, 3: 5, 4: 4, 5: 4, 6: 4 };

// Default ruleset for a given player count — used both as the frontend's
// default and the backend's fallback when a room's stored ruleset no longer
// fits who actually joined.
export function bracketForPlayerCount(playerCount) {
  if (playerCount >= 2 && playerCount <= 4) return 'classic';
  if (playerCount >= 5 && playerCount <= 6) return 'extended';
  return null;
}

export function isValidRulesetForPlayerCount(ruleset, playerCount) {
  if (ruleset === 'classic') return playerCount >= 2 && playerCount <= 4;
  if (ruleset === 'extended') return playerCount >= 2 && playerCount <= 6;
  return false;
}

// Flat array of cardId strings, one per physical card (e.g. 5x 'guard').
export function buildDeck(playerCount, ruleset = 'classic') {
  if (!isValidRulesetForPlayerCount(ruleset, playerCount)) {
    throw Object.assign(
      new Error(`Unsupported ruleset/player count combo: ${ruleset}/${playerCount}`),
      { code: 'unsupported-player-count' }
    );
  }

  const counts = DECKS[ruleset];
  const deck = [];
  for (const [cardId, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) deck.push(cardId);
  }
  return deck;
}

export function cardValue(cardId) {
  return CARD_DEFS[cardId].value;
}

export function cardName(cardId) {
  return CARD_DEFS[cardId].name;
}
