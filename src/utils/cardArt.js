// Card art lookup, shaped to match the platform roadmap's future
// `themes/{themeId}.cardArt` doc — so when a theme picker exists, swapping
// art styles is a data change here, not another refactor. No real art files
// ship yet (none provided); paths point at the expected drop-in location.
export const THEMES = {
  default: {
    displayName: 'Classic',
    backImageUrl: '/card-art/love-letter/back.png',
    cardArt: {
      guard: '/card-art/love-letter/guard-front.png',
      priest: '/card-art/love-letter/priest-front.png',
      baron: '/card-art/love-letter/baron-front.png',
      handmaid: '/card-art/love-letter/handmaid-front.png',
      prince: '/card-art/love-letter/prince-front.png',
      king: '/card-art/love-letter/king-front.png',
      countess: '/card-art/love-letter/countess-front.png',
      princess: '/card-art/love-letter/princess-front.png',
    },
  },
};

export function frontImageFor(cardId, themeId = 'default') {
  return THEMES[themeId]?.cardArt?.[cardId];
}

export function backImageFor(themeId = 'default') {
  return THEMES[themeId]?.backImageUrl;
}
