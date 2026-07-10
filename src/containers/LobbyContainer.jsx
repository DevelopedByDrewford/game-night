import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SeatRow } from '../components/game/SeatRow.jsx';
import { InviteFriendsModal } from '../components/game/InviteFriendsModal.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRoomPresenceMap } from '../hooks/useRoomPresenceMap.js';
import { usePresenceMap } from '../hooks/usePresenceMap.js';
import { useFollowing } from '../hooks/useFollowing.js';
import { leaveRoom, startGame, joinRoomById, inviteToRoom } from '../utils/rooms.js';
import { dealTiles } from '../utils/wordyGameplay.js';
import { colorForId } from '../utils/colors.js';
import { roomLabel } from '../utils/roomLabel.js';
import './LobbyContainer.css';

export function LobbyContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const presence = useRoomPresenceMap(room.id);
  const { friends } = useFollowing();
  const friendPresence = usePresenceMap(friends.map((f) => f.uid));
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [invitedUids, setInvitedUids] = useState(new Set());
  const [inviteBusyUid, setInviteBusyUid] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const isHost = user?.uid === room.hostUid;
  const isMember = room.players.some((p) => p.uid === user?.uid);
  const seatCount = room.settings?.playerCount || room.players.length;
  const filledCount = room.players.length;
  const canStart = isHost && filledCount >= 2;
  const roomFull = filledCount >= seatCount;
  const invitableFriends = friends.filter((f) => !room.players.some((p) => p.uid === f.uid));

  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    const player = room.players[i];
    if (!player) {
      seats.push({ empty: true });
      continue;
    }
    const isPlayerHost = player.uid === room.hostUid;
    const online = Boolean(presence[player.uid]);
    seats.push({
      uid: player.uid,
      name: player.displayName,
      filled: true,
      color: colorForId(player.uid),
      online,
      statusLabel: `${online ? 'Online' : 'Offline'}${isPlayerHost ? ' · Host' : ''}`,
      hostTag: isPlayerHost ? '(Host)' : '',
      canLeave: player.uid === user?.uid && !isPlayerHost,
    });
  }

  async function handleLeave() {
    try {
      await leaveRoom({ roomId: room.id, uid: user.uid });
      navigate('/dashboard');
    } catch (err) {
      console.error('[LobbyContainer] failed to leave room', err);
      setError("Couldn't leave the room — try again.");
    }
  }

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      if (room.gameType === 'a-little-wordy') {
        await dealTiles({ roomId: room.id });
      } else {
        await startGame({ roomId: room.id });
      }
    } catch (err) {
      console.error('[LobbyContainer] failed to start game', err);
      setError("Couldn't start the game — try again.");
      setStarting(false);
    }
  }

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await joinRoomById({ roomId: room.id, uid: user.uid, displayName: user.displayName || 'Player' });
    } catch (err) {
      console.error('[LobbyContainer] failed to join room', err);
      const messages = {
        ROOM_NOT_JOINABLE: 'This game has already started or ended.',
        ROOM_FULL: 'This room is full.',
      };
      setError(messages[err.message] || "Couldn't join that room — try again.");
      setJoining(false);
    }
  }

  async function handleInvite(targetUid) {
    setInviteBusyUid(targetUid);
    setError(null);
    try {
      await inviteToRoom({ roomId: room.id, targetUid });
      setInvitedUids((prev) => new Set(prev).add(targetUid));
    } catch (err) {
      console.error('[LobbyContainer] failed to invite', err);
      setError("Couldn't send that invite — try again.");
    } finally {
      setInviteBusyUid(null);
    }
  }

  return (
    <>
      <RoomChromeHeader title="Waiting Room" />
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <div className="lobby-title-row">
          <div className="lobby-title">{roomLabel(room)}</div>
          <div className="lobby-code-row">
            <div className="lobby-code">{room.code}</div>
            {isMember && !roomFull && (
              <Button $variant="outline" onClick={() => setInviteModalOpen(true)}>
                Invite Friends
              </Button>
            )}
          </div>
        </div>
        <div className="lobby-subtitle">
          {filledCount} of {seatCount} seats filled
        </div>

        <div className="lobby-seats">
          {seats.map((seat, i) => (
            <SeatRow key={seat.uid || i} seat={seat} onLeave={handleLeave} />
          ))}
        </div>

        {!isMember ? (
          <>
            <Button $fullWidth disabled={joining || roomFull} onClick={handleJoin}>
              {roomFull ? 'Room Full' : joining ? 'Joining…' : 'Join Game'}
            </Button>
            <div className="lobby-helper-text">You're not in this room yet — join in to grab a seat.</div>
          </>
        ) : isHost ? (
          <>
            <Button $fullWidth disabled={!canStart || starting} onClick={handleStart}>
              Start Game
            </Button>
            <div className="lobby-helper-text">Only the host can start — need at least 2 players.</div>
          </>
        ) : (
          <div className="lobby-helper-text">Waiting for the host to start the game…</div>
        )}
        {error && <div className="lobby-error-text">{error}</div>}
      </PageWrap>

      {inviteModalOpen && (
        <InviteFriendsModal
          friends={invitableFriends}
          presence={friendPresence}
          invitedUids={invitedUids}
          busyUid={inviteBusyUid}
          onInvite={handleInvite}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </>
  );
}
