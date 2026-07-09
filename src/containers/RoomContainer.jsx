import { useParams } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom.js';
import { useRoomPresence } from '../hooks/useRoomPresence.js';
import { LobbyContainer } from './LobbyContainer.jsx';
import { ActiveTableContainer } from './ActiveTableContainer.jsx';
import { WordyTableContainer } from './WordyTableContainer.jsx';
import { PageWrap } from '../components/layout/PageWrap.jsx';
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
      </PageWrap>
    );
  }

  if (room.status === 'waiting') return <LobbyContainer room={room} />;
  if (room.status === 'active') {
    return room.gameType === 'a-little-wordy' ? <WordyTableContainer room={room} /> : <ActiveTableContainer room={room} />;
  }

  return (
    <PageWrap $maxWidth="640px">
      <div className="room-status-text">This game has ended.</div>
    </PageWrap>
  );
}
