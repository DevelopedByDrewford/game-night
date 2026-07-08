import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GameCard } from '../components/game/GameCard.jsx';
import { EmptyStateCard } from '../components/game/EmptyStateCard.jsx';
import { useMyRooms } from '../hooks/useMyRooms.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { joinRoomByCode } from '../utils/rooms.js';
import { colorForId } from '../utils/colors.js';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 48px;
  letter-spacing: -1px;

  @media (max-width: 640px) {
    font-size: 30px;
    letter-spacing: -0.5px;
  }
`;

const Subtitle = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.inkFaint};
  margin-top: 6px;
`;

const Ctas = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 640px) {
    flex-direction: column;
    width: 100%;
  }
`;

const JoinButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CodeDots = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  letter-spacing: 2px;
  color: rgba(46, 32, 19, 0.5);
`;

const JoinForm = styled.form`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const CodeInput = styled.input`
  font-family: ${({ theme }) => theme.fonts.mono};
  letter-spacing: 3px;
  font-size: 15px;
  font-weight: 700;
  width: 100px;
  padding: 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: #2e2013;
  text-transform: uppercase;
`;

const JoinError = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.terracotta};
  width: 100%;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.gap.grid};
`;

const StatusText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

const STATUS_LABELS = {
  waiting: { label: 'Waiting…', filled: false },
  active: { label: 'In Progress', filled: false },
  completed: { label: 'Completed', filled: false },
};

export function DashboardContainer() {
  const { rooms, loading } = useMyRooms();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  async function handleJoinSubmit(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const { roomId } = await joinRoomByCode({
        code: joinCode,
        uid: user.uid,
        displayName: user.displayName || 'Player',
      });
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      const messages = {
        ROOM_NOT_FOUND: 'No room found with that code.',
        ROOM_NOT_JOINABLE: 'That game has already started or ended.',
        ROOM_FULL: 'That room is full.',
      };
      setJoinError(messages[err.message] || "Couldn't join that room.");
      setJoining(false);
    }
  }

  return (
    <PageWrap>
      <Header>
        <div>
          <Title>My Games</Title>
          <Subtitle>Pick up where you left off, or start something new.</Subtitle>
        </div>
        <Ctas>
          <Button as={Link} to="/rooms/new">
            + Create Room
          </Button>
          {joinOpen ? (
            <JoinForm onSubmit={handleJoinSubmit}>
              <CodeInput
                autoFocus
                maxLength={4}
                placeholder="CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <Button type="submit" disabled={joining}>
                Join
              </Button>
              {joinError && <JoinError>{joinError}</JoinError>}
            </JoinForm>
          ) : (
            <JoinButton as="button" type="button" $variant="outline" onClick={() => setJoinOpen(true)}>
              Join via code <CodeDots>····</CodeDots>
            </JoinButton>
          )}
        </Ctas>
      </Header>

      {loading && <StatusText>Loading your games…</StatusText>}

      {!loading && (
        <Grid>
          {rooms.map((room) => {
            const status = STATUS_LABELS[room.status] || STATUS_LABELS.waiting;
            return (
              <GameCard
                key={room.id}
                to={`/rooms/${room.id}`}
                name={`Room ${room.code}`}
                playerColors={(room.players || []).map((p) => colorForId(p.uid))}
                status={status.label}
                statusFilled={status.filled}
              />
            );
          })}
          <EmptyStateCard />
        </Grid>
      )}
    </PageWrap>
  );
}
