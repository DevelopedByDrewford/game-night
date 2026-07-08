import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SeatRow } from '../components/game/SeatRow.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRoomPresenceMap } from '../hooks/useRoomPresenceMap.js';
import { leaveRoom, startGame } from '../utils/rooms.js';
import { colorForId } from '../utils/colors.js';

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 36px;
  letter-spacing: -1px;
  text-shadow: 0 2px 14px rgba(227, 167, 62, 0.2);
`;

const Code = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 16px;
  letter-spacing: 3px;
  color: ${({ theme }) => theme.colors.inkFaint};
`;

const Subtitle = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.inkFaint};
  margin-bottom: 26px;
`;

const Seats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 26px;
`;

const HelperText = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkFainter};
  margin-top: 10px;
`;

const ErrorText = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.terracotta};
  margin-top: 10px;
`;

export function LobbyContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const presence = useRoomPresenceMap(room.id);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  const isHost = user?.uid === room.hostUid;
  const seatCount = room.settings?.playerCount || room.players.length;
  const filledCount = room.players.length;
  const canStart = isHost && filledCount >= 2;

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
      await startGame({ roomId: room.id });
    } catch (err) {
      console.error('[LobbyContainer] failed to start game', err);
      setError("Couldn't start the game — try again.");
      setStarting(false);
    }
  }

  return (
    <>
      <RoomChromeHeader title="Waiting Room" />
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <TitleRow>
          <Title>Waiting Room</Title>
          <Code>{room.code}</Code>
        </TitleRow>
        <Subtitle>
          {filledCount} of {seatCount} seats filled
        </Subtitle>

        <Seats>
          {seats.map((seat, i) => (
            <SeatRow key={seat.uid || i} seat={seat} onLeave={handleLeave} />
          ))}
        </Seats>

        {isHost ? (
          <>
            <Button $fullWidth disabled={!canStart || starting} onClick={handleStart}>
              Start Game
            </Button>
            <HelperText>Only the host can start — need at least 2 players.</HelperText>
          </>
        ) : (
          <HelperText>Waiting for the host to start the game…</HelperText>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </PageWrap>
    </>
  );
}
