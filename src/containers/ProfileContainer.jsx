import styled from 'styled-components';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useGameCatalog } from '../hooks/useGameCatalog.js';
import { useFollowing } from '../hooks/useFollowing.js';
import { colorForId } from '../utils/colors.js';

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 36px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  padding: 26px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  background-color: #f6e9ce;
  background-image: radial-gradient(circle, rgba(200, 89, 47, 0.18) 1.5px, transparent 1.7px),
    radial-gradient(circle, rgba(227, 167, 62, 0.18) 1.5px, transparent 1.7px),
    radial-gradient(circle, rgba(124, 140, 74, 0.18) 1.5px, transparent 1.7px);
  background-size: 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 5px 7px, 9px 2px;
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 38px;
  letter-spacing: -1px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
`;

const Meta = styled.div`
  font-size: 14px;
  color: rgba(46, 32, 19, 0.6);
  margin-top: 2px;
`;

const StatsTitle = styled.div`
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 14px;
`;

const StatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const StatRow = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: ${({ $live }) => ($live ? 1 : 0.5)};
  box-shadow: ${({ theme }) => theme.shadows.button};
`;

const StatThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: ${({ $stripe, theme }) => `repeating-linear-gradient(45deg, ${$stripe}33, ${$stripe}33 6px, ${theme.colors.surface} 6px, ${theme.colors.surface} 12px)`};
  flex: none;
`;

const StatName = styled.div`
  font-weight: 700;
  font-size: 16px;
`;

const StatDetail = styled.div`
  font-size: 13px;
  color: ${({ $live }) => (
    $live ? 'rgba(46, 32, 19, 0.6)' : 'rgba(46, 32, 19, 0.4)'
  )};
`;

const StatusText = styled.div`
  font-size: 14px;
  color: rgba(46, 32, 19, 0.5);
`;

const IdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 30px;
  font-size: 12px;
  color: rgba(46, 32, 19, 0.5);
`;

const IdValue = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 3px 8px;
`;

const CopyButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
`;

function formatJoinDate(timestamp) {
  if (!timestamp?.toDate) return 'recently';
  return timestamp.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function ProfileContainer() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { games, loading: catalogLoading } = useGameCatalog();
  const { friends } = useFollowing();

  if (profileLoading || catalogLoading) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <StatusText>Loading profile…</StatusText>
      </PageWrap>
    );
  }

  const displayName = profile?.displayName || user?.displayName || 'Player';
  const avatarColor = colorForId(user?.uid || '');

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <Hero>
        <Avatar size={88} color={avatarColor} borderWidth={2} borderColor="rgba(46,32,19,.22)" />
        <div>
          <Name>{displayName}</Name>
          <Meta>
            Joined {formatJoinDate(profile?.createdAt)} · {friends.length} friend
            {friends.length === 1 ? '' : 's'}
          </Meta>
        </div>
      </Hero>

      <IdRow>
        Your user ID (share this so friends can follow you):
        <IdValue>{user?.uid}</IdValue>
        <CopyButton onClick={() => navigator.clipboard?.writeText(user?.uid || '')}>Copy</CopyButton>
      </IdRow>

      <StatsTitle>Stats by game</StatsTitle>
      <StatsList>
        {games.map((game) => {
          const stat = profile?.stats?.[game.id];
          const wins = stat?.wins || 0;
          const gamesPlayed = stat?.gamesPlayed || 0;
          const losses = Math.max(0, gamesPlayed - wins);
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

          return (
            <StatRow key={game.id} $live={game.active}>
              <StatThumb $stripe={game.active ? '#C8592F' : '#8a8272'} />
              <div>
                <StatName>{game.displayName || game.id}</StatName>
                {game.active ? (
                  <StatDetail $live>
                    {wins}W – {losses}L · {winRate}% win rate
                  </StatDetail>
                ) : (
                  <StatDetail>Coming soon</StatDetail>
                )}
              </div>
            </StatRow>
          );
        })}
      </StatsList>
    </PageWrap>
  );
}
