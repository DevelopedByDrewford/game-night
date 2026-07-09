import { useState } from 'react';
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
import './DashboardContainer.css';

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
  // Rooms I'm already a player in (useMyRooms is playerUids array-contains
  // me), regardless of how I joined — lets the activity feed show "Joined
  // Game" on a still-pending invite instead of stale Join/Decline buttons.
  const joinedRoomIds = new Set(rooms.map((r) => r.id));
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
      <div className="dashboard-header">
        <div>
          <div className="dashboard-title">My Games</div>
          <div className="dashboard-subtitle">Pick up where you left off, or start something new.</div>
        </div>
        <div className="dashboard-ctas">
          <Button as={Link} to="/rooms/new">
            + Create Room
          </Button>
          {joinOpen ? (
            <form className="dashboard-join-form" onSubmit={handleJoinSubmit}>
              <input
                className="dashboard-code-input"
                autoFocus
                maxLength={4}
                placeholder="CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <Button type="submit" disabled={joining}>
                Join
              </Button>
              {joinError && <div className="dashboard-join-error">{joinError}</div>}
            </form>
          ) : (
            <Button
              as="button"
              type="button"
              $variant="outline"
              className="dashboard-join-button"
              onClick={() => setJoinOpen(true)}
            >
              Join via code <span className="dashboard-code-dots">····</span>
            </Button>
          )}
        </div>
      </div>

      {loading && <div className="dashboard-status-text">Loading your games…</div>}

      {!loading && (
        <div className="dashboard-grid">
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
        </div>
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
        joinedRoomIds={joinedRoomIds}
      />

      {deleteTarget && (
        <Modal onClose={() => !deleting && setDeleteTarget(null)}>
          <div className="dashboard-modal-title">Delete this room?</div>
          <div className="dashboard-modal-text">
            This can't be undone — the room and its invite code will be gone for everyone.
          </div>
          <div className="dashboard-modal-actions">
            <Button onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
            <Button $variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
