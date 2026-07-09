import { useState } from 'react';
import { CARD_DEFS, CARD_ORDER, DECKS } from '../../utils/cards.js';
import './RulesReferencePanel.css';

function rowsFor(ruleset) {
  const counts = DECKS[ruleset] || DECKS.classic;
  return CARD_ORDER.filter((id) => counts[id] > 0).map((id) => ({ id, copies: counts[id], ...CARD_DEFS[id] }));
}

function ReferenceList({ ruleset }) {
  return (
    <div className="rules-reference-list">
      {rowsFor(ruleset).map((row) => (
        <div className="rules-reference-entry" key={row.id}>
          <div className="rules-reference-entry__header">
            <span className="rules-reference-entry__value-badge">{row.value}</span>
            <div className="rules-reference-entry__name">{row.name}</div>
            <div className="rules-reference-entry__copies">×{row.copies}</div>
          </div>
          <div className="rules-reference-entry__effect">{row.description}</div>
        </div>
      ))}
    </div>
  );
}

// Persistent panel on desktop (sits alongside the action log); a peeking
// edge tab that slides out a drawer on mobile, so it doesn't eat table
// space on small screens.
export function RulesReferencePanel({ ruleset }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rules-reference-desktop-panel">
        <div className="rules-reference-title">Card Reference</div>
        <ReferenceList ruleset={ruleset} />
      </div>

      <button className="rules-reference-tab" onClick={() => setOpen(true)} aria-label="Open card reference">
        Reference
      </button>
      <div
        className={`rules-reference-backdrop${open ? ' rules-reference-backdrop--open' : ''}`}
        onClick={() => setOpen(false)}
      />
      <div className={`rules-reference-drawer${open ? ' rules-reference-drawer--open' : ''}`}>
        <div className="rules-reference-close-row">
          <button className="rules-reference-close-button" onClick={() => setOpen(false)} aria-label="Close card reference">
            ✕
          </button>
        </div>
        <div className="rules-reference-title">Card Reference</div>
        <ReferenceList ruleset={ruleset} />
      </div>
    </>
  );
}
