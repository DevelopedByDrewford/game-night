import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom.js';
import { useRoomPresence } from '../hooks/useRoomPresence.js';
import { LobbyContainer } from './LobbyContainer.jsx';
import { ActiveTableContainer } from './ActiveTableContainer.jsx';
import { PageWrap } from '../components/layout/PageWrap.jsx';

const StatusText = styled.div`
  font-size: 14px;
  color: rgba(46, 32, 19, 0.5);
`;

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
        <StatusText>Loading room…</StatusText>
      </PageWrap>
    );
  }

  if (!room) {
    return (
      <PageWrap $maxWidth="640px">
        <StatusText>This room doesn't exist or you don't have access to it.</StatusText>
      </PageWrap>
    );
  }

  if (room.status === 'waiting') return <LobbyContainer room={room} />;
  if (room.status === 'active') return <ActiveTableContainer room={room} />;

  return (
    <PageWrap $maxWidth="640px">
      <StatusText>This game has ended.</StatusText>
    </PageWrap>
  );
}
