// Catalog tile art, keyed by gameCatalog's doc id (== gameType, e.g.
// 'love-letter'). Same drop-in pattern as src/utils/cardArt.js — no files
// ship yet, so CatalogCard falls back to its striped placeholder until an
// image lands at the path below.
export const CATALOG_ART = {
  'love-letter': '/catalog-art/love-letter.png',
};

export function catalogArtFor(gameType) {
  return CATALOG_ART[gameType];
}
