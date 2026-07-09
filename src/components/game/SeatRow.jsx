import { Avatar } from '../ui/Avatar.jsx';
import './SeatRow.css';

export function SeatRow({ seat, onLeave }) {
  if (seat.empty) {
    return (
      <div className="seat-row">
        <div className="seat-row__empty-circle" />
        <div className="seat-row__empty-text">Open seat</div>
      </div>
    );
  }

  return (
    <div className="seat-row">
      <Avatar size={42} color={seat.color} showStatus online={seat.online} statusRingColor="#F5ECD8" />
      <div className="seat-row__info">
        <div className="seat-row__name">
          {seat.name} {seat.hostTag && <span className="seat-row__host-tag">{seat.hostTag}</span>}
        </div>
        <div className="seat-row__status">{seat.statusLabel}</div>
      </div>
      {seat.canLeave && (
        <button className="seat-row__leave-button" onClick={onLeave}>
          Leave
        </button>
      )}
    </div>
  );
}
