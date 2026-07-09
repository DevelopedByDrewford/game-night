import { PageWrap } from '../components/layout/PageWrap.jsx';
import { CatalogCard } from '../components/game/CatalogCard.jsx';
import { useGameCatalog } from '../hooks/useGameCatalog.js';
import { catalogArtFor } from '../utils/catalogArt.js';
import './CatalogContainer.css';

function playerRange(game) {
  if (game.minPlayers && game.maxPlayers && game.minPlayers !== game.maxPlayers) {
    return `${game.minPlayers}–${game.maxPlayers} players`;
  }
  return `${game.minPlayers || game.maxPlayers || 2} players`;
}

export function CatalogContainer() {
  const { games, loading } = useGameCatalog();

  return (
    <PageWrap>
      <div className="catalog-header">
        <div className="catalog-title">Choose a Game</div>
        <div className="catalog-subtitle">More tables are pulling up a chair soon.</div>
      </div>

      {loading && <div className="catalog-status-text">Loading catalog…</div>}

      {!loading && games.length === 0 && (
        <div className="catalog-status-text">
          No games in the catalog yet — run the seed script (scripts/seedCatalog.mjs) against your Firebase project.
        </div>
      )}

      {!loading && games.length > 0 && (
        <div className="catalog-grid">
          {games.map((game) => (
            <CatalogCard
              key={game.id}
              gameType={game.id}
              name={game.displayName || game.id}
              range={playerRange(game)}
              available={Boolean(game.active)}
              stripeColor={game.active ? '#C8592F' : '#8a8272'}
              imageUrl={catalogArtFor(game.id)}
            />
          ))}
        </div>
      )}
    </PageWrap>
  );
}
