import { PlayingCard } from './PlayingCard.jsx';
import { frontImageFor } from '../../utils/cardArt.js';
import './DiscardPileRow.css';

// Shared "row of small played cards" used both under a player's own hand
// and in each OpponentSeat — kept as one component so the two stay visually
// consistent, and so DiscardsModal can reuse it at a larger size.
export function DiscardPileRow({
  discards = [],
  label = 'Discard',
  cardWidth = 22,
  cardHeight = 30,
  cardRadius = 4,
  align = 'center',
  onClick,
}) {
  return (
    <div className={`discard-pile${onClick ? ' discard-pile--clickable' : ''}`} onClick={onClick}>
      {label && <div className="discard-pile__label">{label}</div>}
      <div className="discard-pile__row" style={{ justifyContent: align }}>
        {discards.length === 0 ? (
          <div className="discard-pile__empty">None yet</div>
        ) : (
          discards.map((cardId, i) => (
            <PlayingCard
              key={`${cardId}-${i}`}
              width={cardWidth}
              height={cardHeight}
              radius={cardRadius}
              stripe="#C8592F"
              stripeSize={4}
              frontImageUrl={frontImageFor(cardId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
