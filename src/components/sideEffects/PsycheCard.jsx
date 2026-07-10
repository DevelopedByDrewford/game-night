import { PlayingCard } from '../game/PlayingCard.jsx';
import { cardName } from '../../utils/sideEffectsCards.js';
import { frontImageFor } from '../../utils/sideEffectsCardArt.js';
import './PsycheCard.css';

// One Psyche entry — a face-up Disorder, optionally covered by a Drug (a
// small badge, not a full card, since the Disorder itself must stay
// readable underneath) and optionally an askew Episode overlay while a
// persistent punishment (Anorexia/Depression/Impotence) is still being
// enforced. 2.7:4.52 real-card aspect ratio per the design spec. Read-only —
// all action targeting happens via the table's action-picker modal, not by
// clicking cards directly on the board.
const CARD_WIDTH = 78;
const CARD_HEIGHT = 131;

export function PsycheCard({ entry }) {
  const treated = Boolean(entry.drugId);

  return (
    <div className="psyche-card">
      <PlayingCard
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        radius={10}
        stripe={treated ? '#7C8C4A' : '#C8592F'}
        label={cardName(entry.disorderId)}
        frontImageUrl={frontImageFor(entry.disorderId)}
      />
      {treated && (
        <div className="psyche-card__drug-badge" title={cardName(entry.drugId)}>
          💊 {cardName(entry.drugId)}
        </div>
      )}
      {entry.episodeActive && (
        <div className="psyche-card__episode-overlay">
          <PlayingCard
            width={CARD_WIDTH * 0.66}
            height={CARD_HEIGHT * 0.66}
            radius={8}
            stripe="#C8592F"
            label="Episode"
            frontImageUrl={frontImageFor('episode')}
          />
        </div>
      )}
    </div>
  );
}
