import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { colorForId } from '../../utils/colors.js';
import { formatAbsoluteTime } from '../../utils/time.js';

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
  flex-wrap: wrap;
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
  min-width: 160px;
  font-size: 14px;
  color: #2e2013;
`;

const InlineLink = styled(Link)`
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

function describeGameResult(entry, gameNames) {
  const gameName = gameNames[entry.gameType] || 'a game';
  return entry.type === 'game_won'
    ? `You won ${gameName} in Room ${entry.roomCode}! 🎉`
    : `You lost ${gameName} in Room ${entry.roomCode}.`;
}

export function ActivityFeed({
  entries,
  loading,
  gameNames,
  followingUids,
  followBackBusyUid,
  onFollowBack,
  respondBusyId,
  onJoinInvite,
  onDeclineInvite,
}) {
  return (
    <Panel>
      <Title>Activity</Title>

      {loading && <EmptyText>Loading activity…</EmptyText>}
      {!loading && entries.length === 0 && (
        <EmptyText>Nothing yet — invites, new followers, and game updates will show up here.</EmptyText>
      )}

      <List>
        {entries.map((entry) => {
          if (entry.type === 'follow') {
            const alreadyFollowing = followingUids.has(entry.actorUid);
            return (
              <Row key={entry.id}>
                <Avatar size={40} color={colorForId(entry.actorUid)} />
                <Info>
                  <InlineLink to={`/profile/${entry.actorUid}`}>{entry.actorName}</InlineLink> followed you.
                  <TimeText>{formatAbsoluteTime(entry.createdAt)}</TimeText>
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

          if (entry.type === 'invite') {
            const gameName = gameNames[entry.gameType] || 'a game';
            const busy = respondBusyId === entry.id;
            return (
              <Row key={entry.id}>
                <Avatar size={40} color={colorForId(entry.inviterUid)} />
                <Info>
                  <InlineLink to={`/profile/${entry.inviterUid}`}>{entry.inviterName}</InlineLink> invited you to{' '}
                  {gameName} — Room {entry.roomCode}.
                  <TimeText>{formatAbsoluteTime(entry.createdAt)}</TimeText>
                </Info>
                <ButtonGroup>
                  <Button disabled={busy} onClick={() => onJoinInvite(entry)}>
                    Join
                  </Button>
                  <Button $variant="outline" disabled={busy} onClick={() => onDeclineInvite(entry)}>
                    Decline
                  </Button>
                </ButtonGroup>
              </Row>
            );
          }

          if (entry.type === 'player_joined') {
            const gameName = gameNames[entry.gameType] || 'a game';
            return (
              <Row key={entry.id}>
                <Avatar size={40} color={colorForId(entry.playerUid)} />
                <Info>
                  <InlineLink to={`/profile/${entry.playerUid}`}>{entry.playerName}</InlineLink> joined your {gameName}{' '}
                  room — <InlineLink to={`/rooms/${entry.roomId}`}>Room {entry.roomCode}</InlineLink>.
                  <TimeText>{formatAbsoluteTime(entry.createdAt)}</TimeText>
                </Info>
              </Row>
            );
          }

          if (entry.type === 'game_started') {
            const gameName = gameNames[entry.gameType] || 'a game';
            return (
              <Row key={entry.id}>
                <Icon>🚀</Icon>
                <Info>
                  {gameName} is starting — <InlineLink to={`/rooms/${entry.roomId}`}>Room {entry.roomCode}</InlineLink>.
                  <TimeText>{formatAbsoluteTime(entry.createdAt)}</TimeText>
                </Info>
              </Row>
            );
          }

          return (
            <Row key={entry.id}>
              <Icon>{entry.type === 'game_won' ? '🏆' : '🎲'}</Icon>
              <Info>
                {describeGameResult(entry, gameNames)}
                <TimeText>{formatAbsoluteTime(entry.createdAt)}</TimeText>
              </Info>
            </Row>
          );
        })}
      </List>
    </Panel>
  );
}
