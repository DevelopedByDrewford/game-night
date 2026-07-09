import { useEffect } from 'react';
import { PlayingCard } from './PlayingCard.jsx';
import { Button } from '../ui/Button.jsx';
import { frontImageFor } from '../../utils/cardArt.js';
import { parseLogEntry } from '../../utils/turnLog.js';
import './TurnReviewOverlay.css';

// Auto-shown by ActiveTableContainer whenever there are log entries newer
// than the player has reviewed — usually just the turn that was just
// played, but can be several if they were away ("catching up"). `entries`
// is that pending queue (oldest first); `index` is which one is on screen.
export function TurnReviewOverlay({ entries, index, room, viewerUid, onPrevious, onNext, onSkip }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onSkip();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  const entry = entries[index];
  if (!entry) return null;

  const parsed = parseLogEntry(entry, room, viewerUid);
  const isFirst = index === 0;
  const isLast = index === entries.length - 1;

  return (
    <div className="turn-review-backdrop" onClick={onSkip}>
      <div className="turn-review-panel" key={parsed.id} onClick={(e) => e.stopPropagation()}>
        <div className="turn-review-progress">
          TURN {index + 1} OF {entries.length}
        </div>

        {parsed.kind === 'turn' ? (
          <>
            <div className="turn-review-card-preview">
              <PlayingCard
                width={140}
                height={196}
                radius={14}
                stripeSize={10}
                label={parsed.cardName}
                frontImageUrl={frontImageFor(parsed.cardId)}
              />
            </div>
            <div className="turn-review-sentence">
              {parsed.before}
              <strong>{parsed.cardName}</strong>
              {parsed.after}
            </div>
          </>
        ) : (
          <div className="turn-review-announcement">{parsed.message}</div>
        )}

        <div className="turn-review-nav-row">
          <Button $variant="outline" onClick={onPrevious} disabled={isFirst}>
            ◀ Previous
          </Button>
          <Button onClick={onNext}>{isLast ? 'Done' : 'Next ▶'}</Button>
          {!isLast && (
            <Button $variant="outline" onClick={onSkip}>
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
