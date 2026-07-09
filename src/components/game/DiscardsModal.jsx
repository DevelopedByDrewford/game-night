import styled from 'styled-components';
import { Modal } from '../ui/Modal.jsx';
import { DiscardPileRow } from './DiscardPileRow.jsx';

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 22px;
  color: #2e2013;
  margin-bottom: 18px;
`;

const ScrollArea = styled.div`
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-right: 4px;
`;

const PlayerName = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: #2e2013;
  margin-bottom: 8px;
`;

// Shows every player's discard pile (self included) at an enlarged size,
// scrollable so a long game with many players/discards stays reachable —
// opened from any player's small discard row (own hand or an OpponentSeat).
export function DiscardsModal({ players, onClose }) {
  return (
    <Modal onClose={onClose} wide>
      <Title>Discard piles</Title>
      <ScrollArea>
        {players.map((p) => (
          <div key={p.uid}>
            <PlayerName>{p.name}{p.isYou ? ' (You)' : ''}</PlayerName>
            <DiscardPileRow discards={p.discards} label={null} cardWidth={48} cardHeight={66} cardRadius={8} />
          </div>
        ))}
      </ScrollArea>
    </Modal>
  );
}
