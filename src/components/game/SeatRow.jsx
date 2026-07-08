import styled from 'styled-components';
import { Avatar } from '../ui/Avatar.jsx';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 14px 18px;
`;

const EmptyCircle = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1.5px dashed rgba(46, 32, 19, 0.28);
  flex: none;
`;

const Info = styled.div`
  flex: 1;
`;

const NameRow = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #2e2013;
`;

const HostTag = styled.span`
  font-weight: 400;
  color: rgba(46, 32, 19, 0.5);
  font-size: 12px;
`;

const StatusText = styled.div`
  font-size: 12px;
  color: rgba(46, 32, 19, 0.5);
`;

const EmptyText = styled.div`
  flex: 1;
  font-size: 14px;
  color: rgba(46, 32, 19, 0.4);
`;

const LeaveButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: #2e2013;
  font-family: inherit;
`;

export function SeatRow({ seat, onLeave }) {
  if (seat.empty) {
    return (
      <Row>
        <EmptyCircle />
        <EmptyText>Open seat</EmptyText>
      </Row>
    );
  }

  return (
    <Row>
      <Avatar size={42} color={seat.color} showStatus online={seat.online} statusRingColor="#F5ECD8" />
      <Info>
        <NameRow>
          {seat.name} {seat.hostTag && <HostTag>{seat.hostTag}</HostTag>}
        </NameRow>
        <StatusText>{seat.statusLabel}</StatusText>
      </Info>
      {seat.canLeave && <LeaveButton onClick={onLeave}>Leave</LeaveButton>}
    </Row>
  );
}
