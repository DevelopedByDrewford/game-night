import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { colorForId } from '../../utils/colors.js';

const Panel = styled.div`
  margin-top: 30px;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 24px;
  letter-spacing: -0.5px;
  margin-bottom: 14px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 12px 16px;
`;

const Icon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${({ theme }) => theme.colors.pageBg};
`;

const Info = styled.div`
  flex: 1;
  font-size: 14px;
  color: #2e2013;
`;

const ActorLink = styled(Link)`
  font-weight: 700;
  color: #2e2013;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const TimeText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkFainter};
  margin-top: 2px;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

function timeAgo(timestamp) {
  if (!timestamp?.toDate) return '';
  const diffMs = Date.now() - timestamp.toDate().getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function describeGameResult(entry, gameNames) {
  const gameName = gameNames[entry.gameType] || 'a game';
  return entry.type === 'game_won'
    ? `You won ${gameName} in Room ${entry.roomCode}! 🎉`
    : `You lost ${gameName} in Room ${entry.roomCode}.`;
}

export function ActivityFeed({ entries, loading, gameNames, followingUids, followBackBusyUid, onFollowBack }) {
  return (
    <Panel>
      <Title>Activity</Title>

      {loading && <EmptyText>Loading activity…</EmptyText>}
      {!loading && entries.length === 0 && <EmptyText>Nothing yet — new followers and game results will show up here.</EmptyText>}

      <List>
        {entries.map((entry) => {
          if (entry.type === 'follow') {
            const alreadyFollowing = followingUids.has(entry.actorUid);
            return (
              <Row key={entry.id}>
                <Avatar size={40} color={colorForId(entry.actorUid)} />
                <Info>
                  <ActorLink to={`/profile/${entry.actorUid}`}>{entry.actorName}</ActorLink> followed you.
                  <TimeText>{timeAgo(entry.createdAt)}</TimeText>
                </Info>
                <Button
                  $variant="outline"
                  disabled={alreadyFollowing || followBackBusyUid === entry.actorUid}
                  onClick={() => onFollowBack(entry.actorUid)}
                >
                  {alreadyFollowing ? 'Following' : 'Follow Back'}
                </Button>
              </Row>
            );
          }

          return (
            <Row key={entry.id}>
              <Icon>{entry.type === 'game_won' ? '🏆' : '🎲'}</Icon>
              <Info>
                {describeGameResult(entry, gameNames)}
                <TimeText>{timeAgo(entry.createdAt)}</TimeText>
              </Info>
            </Row>
          );
        })}
      </List>
    </Panel>
  );
}
