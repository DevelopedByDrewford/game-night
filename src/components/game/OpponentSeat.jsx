import styled from 'styled-components';
import { Avatar } from '../ui/Avatar.jsx';
import { PlayingCard } from './PlayingCard.jsx';

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
  color: rgba(46, 32, 19, 0.5);
  margin-bottom: 6px;
`;

const DiscardLabel = styled.div`
  font-size: 10px;
  color: rgba(46, 32, 19, 0.5);
  margin-bottom: 4px;
`;

const Discards = styled.div`
  display: flex;
  gap: 3px;
  justify-content: center;
`;

export function OpponentSeat({ name, color, online, statusLabel, discardCount, isCurrentTurn }) {
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
      <DiscardLabel>Discard</DiscardLabel>
      <Discards>
        {Array.from({ length: discardCount }).map((_, i) => (
          <PlayingCard key={i} width={22} height={30} radius={4} stripe="#C8592F" stripeSize={4} />
        ))}
      </Discards>
    </Seat>
  );
}
