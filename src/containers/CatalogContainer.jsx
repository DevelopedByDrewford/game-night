import styled from 'styled-components';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { CatalogCard } from '../components/game/CatalogCard.jsx';
import { useGameCatalog } from '../hooks/useGameCatalog.js';

const Header = styled.div`
  margin-bottom: 28px;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 46px;
  letter-spacing: -1px;
  margin-bottom: 6px;
`;

const Subtitle = styled.div`
  font-size: 15px;
  color: rgba(46, 32, 19, 0.6);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.gap.gridWide};
`;

const StatusText = styled.div`
  font-size: 14px;
  color: rgba(46, 32, 19, 0.5);
`;

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
      <Header>
        <Title>Choose a Game</Title>
        <Subtitle>More tables are pulling up a chair soon.</Subtitle>
      </Header>

      {loading && <StatusText>Loading catalog…</StatusText>}

      {!loading && games.length === 0 && (
        <StatusText>
          No games in the catalog yet — run the seed script (scripts/seedCatalog.mjs) against your
          Firebase project.
        </StatusText>
      )}

      {!loading && games.length > 0 && (
        <Grid>
          {games.map((game) => (
            <CatalogCard
              key={game.id}
              name={game.displayName || game.id}
              range={playerRange(game)}
              available={Boolean(game.active)}
              stripeColor={game.active ? '#C8592F' : '#8a8272'}
            />
          ))}
        </Grid>
      )}
    </PageWrap>
  );
}
