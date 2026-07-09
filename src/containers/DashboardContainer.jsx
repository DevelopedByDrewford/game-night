import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { GameCard } from '../components/game/GameCard.jsx';
import { EmptyStateCard } from '../components/game/EmptyStateCard.jsx';
import { ActivityFeed } from '../components/game/ActivityFeed.jsx';
import { useMyRooms } from '../hooks/useMyRooms.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useActivity } from '../hooks/useActivity.js';
import { useFollowing } from '../hooks/useFollowing.js';
import { useGameCatalog } from '../hooks/useGameCatalog.js';
import { joinRoomByCode, joinRoomById, deleteRoom } from '../utils/rooms.js';
import { followUser } from '../utils/follows.js';
import { dismissActivity } from '../utils/activity.js';
import { colorForId } from '../utils/colors.js';
import { catalogArtFor } from '../utils/catalogArt.js';

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

const ModalTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 22px;
  color: #2e2013;
  margin-bottom: 8px;
`;

const ModalText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: rgba(46, 32, 19, 0.75);
  margin-bottom: 22px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
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
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, code }
  const [deleting, setDeleting] = useState(false);

  const { entries: activity, loading: activityLoading } = useActivity();
  const { friends } = useFollowing();
  const { games } = useGameCatalog();
  const followingUids = new Set(friends.map((f) => f.uid));
  const gameNames = Object.fromEntries(games.map((g) => [g.id, g.displayName || g.id]));
  const [followBackBusyUid, setFollowBackBusyUid] = useState(null);
  const [respondBusyId, setRespondBusyId] = useState(null);

  async function handleFollowBack(targetUid) {
    setFollowBackBusyUid(targetUid);
    try {
      await followUser({ uid: user.uid, targetUid });
    } catch (err) {
      console.error('[DashboardContainer] failed to follow back', err);
    } finally {
      setFollowBackBusyUid(null);
    }
  }

  async function handleJoinInvite(entry) {
    setRespondBusyId(entry.id);
    try {
      await joinRoomById({ roomId: entry.roomId, uid: user.uid, displayName: user.displayName || 'Player' });
      await dismissActivity({ uid: user.uid, eventId: entry.id });
      navigate(`/rooms/${entry.roomId}`);
    } catch (err) {
      console.error('[DashboardContainer] failed to join invited room', err);
      setRespondBusyId(null);
    }
  }

  async function handleDeclineInvite(entry) {
    setRespondBusyId(entry.id);
    try {
      await dismissActivity({ uid: user.uid, eventId: entry.id });
    } catch (err) {
      console.error('[DashboardContainer] failed to decline invite', err);
    } finally {
      setRespondBusyId(null);
    }
  }

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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRoom({ roomId: deleteTarget.id, code: deleteTarget.code });
      setDeleteTarget(null);
    } catch (err) {
      console.error('[DashboardContainer] failed to delete room', err);
    } finally {
      setDeleting(false);
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
            // Only the host can delete their own room, and only when it's
            // not actively being played — an active game must be ended
            // ("End Game Early", from inside the room) first so this can
            // never yank a live game out from under other players.
            const canDelete = room.hostUid === user.uid && room.status !== 'active';
            return (
              <GameCard
                key={room.id}
                to={`/rooms/${room.id}`}
                name={`Room ${room.code}`}
                playerColors={(room.players || []).map((p) => colorForId(p.uid))}
                status={status.label}
                statusFilled={status.filled}
                onDelete={canDelete ? () => setDeleteTarget({ id: room.id, code: room.code }) : undefined}
                imageUrl={catalogArtFor(room.gameType)}
              />
            );
          })}
          <EmptyStateCard />
        </Grid>
      )}

      <ActivityFeed
        entries={activity}
        loading={activityLoading}
        gameNames={gameNames}
        followingUids={followingUids}
        followBackBusyUid={followBackBusyUid}
        onFollowBack={handleFollowBack}
        respondBusyId={respondBusyId}
        onJoinInvite={handleJoinInvite}
        onDeclineInvite={handleDeclineInvite}
      />

      {deleteTarget && (
        <Modal onClose={() => !deleting && setDeleteTarget(null)}>
          <ModalTitle>Delete this room?</ModalTitle>
          <ModalText>This can't be undone — the room and its invite code will be gone for everyone.</ModalText>
          <ModalActions>
            <Button onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
            <Button $variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
          </ModalActions>
        </Modal>
      )}
    </PageWrap>
  );
}
