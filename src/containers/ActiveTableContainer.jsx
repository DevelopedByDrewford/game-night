import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { OpponentSeat } from '../components/game/OpponentSeat.jsx';
import { PlayingCard } from '../components/game/PlayingCard.jsx';
import { ActionLogPanel } from '../components/game/ActionLogPanel.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { endGameEarly } from '../utils/rooms.js';

const Layout = styled.div`
  max-width: ${({ theme }) => theme.maxWidth.grid};
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    padding-bottom: 90px;
  }
`;

const TableColumn = styled.div`
  flex: 2;
  min-width: 420px;
`;

const Opponents = styled.div`
  display: flex;
  justify-content: space-around;
  margin-bottom: 22px;
  flex-wrap: wrap;
  gap: 14px;
`;

const TurnArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 22px 0;
`;

const TurnIndicator = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.terracotta};
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.terracotta};
`;

const DeckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DeckCount = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.6);
`;

const HandPanel = styled.div`
  border: 3px solid ${({ theme }) => theme.colors.terracotta};
  background: #fdf0e5;
  border-radius: 18px;
  padding: 16px;
  margin-top: 16px;
`;

const HandLabel = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.terracotta};
  letter-spacing: 1px;
  margin-bottom: 10px;
`;

const HandCards = styled.div`
  display: flex;
  gap: 12px;
`;

// Mock table state — real gameplay (dealing hands, resolving card effects) is
// a Phase 1 Cloud Functions concern; this screen renders live once startGame/
// playCard exist. `status: 'active'` today just displays this static state.
const TABLE_OPPONENTS = [
  { name: 'Sam', color: '#7C8C4A', online: true, statusLabel: 'Online', discardCount: 2, isCurrentTurn: false },
  { name: 'Priya', color: '#A25A4A', online: false, statusLabel: 'Offline', discardCount: 1, isCurrentTurn: false },
  { name: 'Alex', color: '#E3A73E', online: true, statusLabel: 'Online', discardCount: 0, isCurrentTurn: true },
];

const ACTION_LOG = [
  'Sam played Guard, guessed Priya has a Baron. Wrong.',
  'Priya discarded Handmaid — protected until next turn.',
  'You drew a card.',
  'Alex played Prince — Sam discards and draws new.',
  'Sam is out of the round.',
  'New round dealt.',
];

const YOUR_HAND = [
  { name: 'Guard', stripe: '#C8592F' },
  { name: 'Priest', stripe: '#7C8C4A' },
];

export function ActiveTableContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ending, setEnding] = useState(false);
  const isHost = user?.uid === room.hostUid;

  async function handleEndGameEarly() {
    setEnding(true);
    try {
      await endGameEarly({ roomId: room.id });
      navigate('/dashboard');
    } catch (err) {
      console.error('[ActiveTableContainer] failed to end game', err);
      setEnding(false);
    }
  }

  return (
    <>
      <RoomChromeHeader
        title={`Room ${room.code}`}
        showEndGameEarly={isHost}
        onEndGameEarly={handleEndGameEarly}
      />
      <Layout>
        <TableColumn>
          <Opponents>
            {TABLE_OPPONENTS.map((op) => (
              <OpponentSeat key={op.name} {...op} />
            ))}
          </Opponents>

          <TurnArea>
            <TurnIndicator>▶ Alex's turn</TurnIndicator>
            <DeckRow>
              <PlayingCard width={44} height={60} radius={8} stripe="#7C8C4A" stripeSize={6} />
              <DeckCount>Deck: 9 left</DeckCount>
            </DeckRow>
          </TurnArea>

          <HandPanel>
            <HandLabel>YOUR HAND — PRIVATE</HandLabel>
            <HandCards>
              {YOUR_HAND.map((card) => (
                <PlayingCard key={card.name} stripe={card.stripe} label={card.name} />
              ))}
            </HandCards>
          </HandPanel>
        </TableColumn>

        <ActionLogPanel entries={ACTION_LOG} />
      </Layout>
    </>
  );
}
