import { Avatar } from '../ui/Avatar.jsx';
import { DiscardPileRow } from './DiscardPileRow.jsx';
import './OpponentSeat.css';

export function OpponentSeat({ name, color, online, statusLabel, discards = [], isCurrentTurn, onDiscardClick }) {
  return (
    <div className="opponent-seat">
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
      <div className="opponent-seat__name">{name}</div>
      <div className="opponent-seat__status">{statusLabel}</div>
      <DiscardPileRow discards={discards} onClick={onDiscardClick} />
    </div>
  );
}
