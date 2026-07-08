// Standard 16-card Love Letter deck (2-4 players). Keyed by player-count
// bracket so 5-6/7-8 (the published expansion) can be added as sibling
// entries later without touching buildDeck's callers.
export const CARD_DEFS = {
  guard: { id: 'guard', name: 'Guard', value: 1 },
  priest: { id: 'priest', name: 'Priest', value: 2 },
  baron: { id: 'baron', name: 'Baron', value: 3 },
  handmaid: { id: 'handmaid', name: 'Handmaid', value: 4 },
  prince: { id: 'prince', name: 'Prince', value: 5 },
  king: { id: 'king', name: 'King', value: 6 },
  countess: { id: 'countess', name: 'Countess', value: 7 },
  princess: { id: 'princess', name: 'Princess', value: 8 },
};

export const DECKS = {
  '2-4': { guard: 5, priest: 2, baron: 2, handmaid: 2, prince: 2, king: 1, countess: 1, princess: 1 },
};

export const TOKENS_TO_WIN = { 2: 7, 3: 5, 4: 4 };

export function bracketForPlayerCount(playerCount) {
  if (playerCount >= 2 && playerCount <= 4) return '2-4';
  return null;
}

// Flat array of cardId strings, one per physical card (e.g. 5x 'guard').
export function buildDeck(playerCount) {
  const bracket = bracketForPlayerCount(playerCount);
  if (!bracket) {
    throw Object.assign(new Error(`Unsupported player count: ${playerCount}`), { code: 'unsupported-player-count' });
  }

  const counts = DECKS[bracket];
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
