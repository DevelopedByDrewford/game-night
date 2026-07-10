import { Avatar } from '../ui/Avatar.jsx';
import { PsycheCard } from './PsycheCard.jsx';
import './PsycheBoard.css';

// One player's Psyche — entirely public info (every Disorder in it is
// face-up by rule), unlike the concealed hand. `onCardClick(index)`, when
// given, opens the fullscreen swipeable viewer (CardCarouselModal) starting
// at that card — omit it to render a non-interactive board.
export function PsycheBoard({ name, color, online, isCurrentTurn, psyche, onCardClick }) {
  return (
    <div className={`psyche-board${isCurrentTurn ? ' psyche-board--current-turn' : ''}`}>
      <div className="psyche-board__header">
        <Avatar size={36} color={color} showStatus online={online} />
        <div className="psyche-board__name">{name}</div>
      </div>
      <div className="psyche-board__cards">
        {psyche.map((entry, i) => (
          <PsycheCard key={entry.disorderId} entry={entry} onClick={onCardClick ? () => onCardClick(i) : undefined} />
        ))}
        {psyche.length === 0 && <div className="psyche-board__empty">Fully treated!</div>}
      </div>
    </div>
  );
}
