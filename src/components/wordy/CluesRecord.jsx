import { useState } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { formatRelativeTime } from '../../utils/time.js';
import { CLUE_DEFS, clueDescription } from '../../utils/wordyClues.js';
import './CluesRecord.css';

const VIEW_OPTIONS = [
  { value: 'theirWord', label: "Their Word" },
  { value: 'myWord', label: 'My Word' },
];

// Every clue activation and guess is logged with structured fields
// (kind/clueId/activatorUid|guesserUid/aboutUid/correct/guess — see
// wordyHandlers.js#appendLogEntry) alongside the human-readable `message`
// already shown in the shared ActionLogPanel. This re-slices that same log
// into two personal, filtered views: what *you've* learned about the
// opponent's word ("Their Word"), and what the opponent has learned about
// *yours* ("My Word") — the latter also shows your own Secret Word up top
// since that's the word being discussed in that view.
export function CluesRecord({ entries, viewerUid, opponentUid, myWord }) {
  const [view, setView] = useState('theirWord');
  const [viewingClueId, setViewingClueId] = useState(null); // clue card being reviewed, read-only

  const relevant = entries.filter((e) => {
    if (e.kind === 'clue') return view === 'theirWord' ? e.activatorUid === viewerUid : e.activatorUid === opponentUid;
    if (e.kind === 'guess') return view === 'theirWord' ? e.guesserUid === viewerUid : e.guesserUid === opponentUid;
    return false;
  });
  const rows = [...relevant].reverse(); // most-recent-first, matching ActionLogPanel

  return (
    <div className="clues-record">
      <div className="clues-record__header">
        <div className="clues-record__title">Clues Record</div>
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>

      {view === 'myWord' && <div className="clues-record__my-word">Your word: {myWord || '—'}</div>}

      {rows.length === 0 ? (
        <div className="clues-record__empty">
          {view === 'theirWord' ? "Nothing gathered about their word yet." : "They haven't learned anything about yours yet."}
        </div>
      ) : (
        <div className="clues-record__list">
          {rows.map((entry) => (
            <div className="clues-record__entry" key={entry.id}>
              {entry.kind === 'clue' ? (
                <>
                  <button
                    type="button"
                    className={`clues-record__tag clues-record__tag--clickable clues-record__tag--${CLUE_DEFS[entry.clueId]?.category || 'vanilla'}`}
                    onClick={() => setViewingClueId(entry.clueId)}
                  >
                    {CLUE_DEFS[entry.clueId]?.title || entry.clueId}
                  </button>
                  <span className="clues-record__detail">{entry.message}</span>
                </>
              ) : (
                <>
                  <span className={`clues-record__tag clues-record__tag--${entry.correct ? 'correct' : 'wrong'}`}>
                    {entry.correct ? 'Correct guess' : 'Wrong guess'}
                  </span>
                  <span className="clues-record__detail">"{entry.guess}"</span>
                </>
              )}
              <div className="clues-record__time">{formatRelativeTime(entry.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {viewingClueId && (
        <Modal onClose={() => setViewingClueId(null)}>
          <span className={`clues-record__tag clues-record__tag--${CLUE_DEFS[viewingClueId]?.category || 'vanilla'}`}>
            {CLUE_DEFS[viewingClueId]?.category === 'spicy' ? 'Spicy' : 'Vanilla'}
          </span>
          <div className="clues-record__modal-title">{CLUE_DEFS[viewingClueId]?.title || viewingClueId}</div>
          <div className="clues-record__modal-description">{clueDescription(viewingClueId)}</div>
          <Button onClick={() => setViewingClueId(null)}>Close</Button>
        </Modal>
      )}
    </div>
  );
}
