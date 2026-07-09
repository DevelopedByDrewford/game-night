import styled from 'styled-components';
import { Avatar } from '../ui/Avatar.jsx';
import { DiscardPileRow } from './DiscardPileRow.jsx';

const Seat = styled.div`
  text-align: center;
`;

const Name = styled.div`
  font-weight: 700;
  font-size: 13px;
  margin-top: 6px;
`;

const Status = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkFainter};
  margin-bottom: 6px;
`;

export function OpponentSeat({ name, color, online, statusLabel, discards = [], isCurrentTurn, onDiscardClick }) {
  return (
    <Seat>
      <Avatar
        size={56}
        color={color}
        showStatus
        online={online}
        statusRingColor="#E8DABF"
        borderColor={isCurrentTurn ? '#C8592F' : '#2E2013'}
        borderWidth={3}
        boxShadow={isCurrentTurn ? '0 0 0 3px #F5ECD8, 0 0 0 6px #C8592F' : 'none'}
      />
      <Name>{name}</Name>
      <Status>{statusLabel}</Status>
      <DiscardPileRow discards={discards} onClick={onDiscardClick} />
    </Seat>
  );
}
