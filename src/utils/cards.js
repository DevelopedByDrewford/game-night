// Frontend copy of the card definitions in functions/lib/deck.js — display
// only (name/value for rendering hands and the guess picker). Duplicated
// rather than shared because functions/ is a separate deployable with its
// own module resolution, not part of the Vite-bundled src tree.
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

export const TARGETED_CARDS = ['guard', 'priest', 'baron', 'king', 'prince'];

export function cardName(cardId) {
  return CARD_DEFS[cardId]?.name || cardId;
}
