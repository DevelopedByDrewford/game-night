import { useParams, Link } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom.js';
import { useRoomPresence } from '../hooks/useRoomPresence.js';
import { LobbyContainer } from './LobbyContainer.jsx';
import { ActiveTableContainer } from './ActiveTableContainer.jsx';
import { WordyTableContainer } from './WordyTableContainer.jsx';
import { SideEffectsTableContainer } from './SideEffectsTableContainer.jsx';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Button } from '../components/ui/Button.jsx';
import './RoomContainer.css';

// Single dynamic route (/rooms/:roomId) that branches on the room's own
// status field, so a shared link/dashboard card always resumes to the right
// screen — no separate lobby/table URLs to keep in sync.
export function RoomContainer() {
  const { roomId } = useParams();
  const { room, loading } = useRoom(roomId);
  useRoomPresence(roomId);

  if (loading) {
    return (
      <PageWrap $maxWidth="640px">
        <div className="room-status-text">Loading room…</div>
      </PageWrap>
    );
  }

  if (!room) {
    return (
      <PageWrap $maxWidth="640px">
        <div className="room-status-text">This room doesn't exist or you don't have access to it.</div>
        <Link to="/dashboard">
          <Button $fullWidth>Return to Dashboard</Button>
        </Link>
      </PageWrap>
    );
  }

  if (room.status === 'waiting') return <LobbyContainer room={room} />;
  if (room.status === 'active') {
    if (room.gameType === 'a-little-wordy') return <WordyTableContainer room={room} />;
    if (room.gameType === 'side-effects') return <SideEffectsTableContainer room={room} />;
    return <ActiveTableContainer room={room} />;
  }

  return (
    <PageWrap $maxWidth="640px">
      <div className="room-status-text">This game has ended.</div>
      <Link to="/dashboard">
        <Button $fullWidth>Return to Dashboard</Button>
      </Link>
    </PageWrap>
  );
}
