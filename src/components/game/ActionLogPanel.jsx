import { formatRelativeTime } from '../../utils/time.js';
import './ActionLogPanel.css';

// `entries` is the raw gameRooms/{roomId}/log docs ({id, message,
// createdAt, ...}), oldest-first (that order matters upstream — e.g.
// ActiveTableContainer's TurnReviewOverlay steps through it sequentially)
// — reversed only here for display, so the most recent turn reads at the
// top. Relative timestamps here (vs. the Dashboard activity feed's
// absolute ones) since this is a live, in-the-moment view of a single game
// session.
export function ActionLogPanel({ entries }) {
  return (
    <div className="action-log-panel">
      <div className="action-log-panel__title">Action Log</div>
      <div className="action-log-panel__list">
        {[...entries].reverse().map((entry) => (
          <div className="action-log-panel__entry" key={entry.id}>
            {entry.message}
            <div className="action-log-panel__time">{formatRelativeTime(entry.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
