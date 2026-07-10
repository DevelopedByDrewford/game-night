import { PlayingCard } from '../game/PlayingCard.jsx';
import { cardName } from '../../utils/sideEffectsCards.js';
import { frontImageFor } from '../../utils/sideEffectsCardArt.js';
import './PsycheCard.css';

// One Psyche entry — a face-up Disorder, covered by a full Drug card
// (offset slightly so a sliver of the Disorder peeks out behind it, like a
// card physically placed on top) once treated — the Drug needs to be fully
// readable, since which specific treatment is covering a Disorder matters
// for gameplay (side-effect exposure, High Tolerance targeting, etc.), not
// just legible as a small badge. Optionally an askew Episode overlay while
// a persistent punishment (Anorexia/Depression/Impotence) is still being
// enforced — mutually exclusive with a Drug, since Episode can only target
// an untreated Disorder. 2.7:4.52 real-card aspect ratio per the design spec.
//
// Sized off --se-card-width/--se-card-height (set on .side-effects-table-layout
// in SideEffectsTableContainer.css) by default, so desktop can run larger
// than mobile without this component needing to know the viewport itself —
// pass explicit `width`/`height` (e.g. from CardCarouselModal's enlarged
// view) to override that.
const DEFAULT_WIDTH = 'var(--se-card-width, 78px)';
const DEFAULT_HEIGHT = 'var(--se-card-height, 131px)';

function scaleSize(value, factor) {
  return typeof value === 'number' ? value * factor : `calc(${value} * ${factor})`;
}

export function PsycheCard({ entry, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, large, onClick }) {
  const treated = Boolean(entry.drugId);

  return (
    <div
      className={`psyche-card${large ? ' psyche-card--large' : ''}${onClick ? ' psyche-card--clickable' : ''}`}
      onClick={onClick}
    >
      <PlayingCard
        width={width}
        height={height}
        radius={10}
        stripe="#C8592F"
        label={cardName(entry.disorderId)}
        frontImageUrl={frontImageFor(entry.disorderId)}
      />
      {treated && (
        <div className="psyche-card__drug-overlay" title={`Treated with ${cardName(entry.drugId)}`}>
          <PlayingCard
            width={width}
            height={height}
            radius={10}
            stripe="#7C8C4A"
            label={cardName(entry.drugId)}
            frontImageUrl={frontImageFor(entry.drugId)}
          />
        </div>
      )}
      {entry.episodeActive && (
        <div className="psyche-card__episode-overlay">
          <PlayingCard
            width={scaleSize(width, 0.66)}
            height={scaleSize(height, 0.66)}
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
