import { Modal } from '../ui/Modal.jsx';
import { DiscardPileRow } from './DiscardPileRow.jsx';
import './DiscardsModal.css';

// Shows every player's discard pile (self included) at an enlarged size,
// scrollable so a long game with many players/discards stays reachable —
// opened from any player's small discard row (own hand or an OpponentSeat).
export function DiscardsModal({ players, onClose }) {
  return (
    <Modal onClose={onClose} wide>
      <div className="discards-modal__title">Discard piles</div>
      <div className="discards-modal__scroll-area">
        {players.map((p) => (
          <div key={p.uid}>
            <div className="discards-modal__player-name">
              {p.name}
              {p.isYou ? ' (You)' : ''}
            </div>
            <DiscardPileRow discards={p.discards} label={null} cardWidth={48} cardHeight={66} cardRadius={8} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
