import { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import './FullRulesButton.css';

// Full-rulebook trigger, paired with a given game's <XRules/> content
// component. Renders as a plain full-width Button beneath the Action Log
// on desktop, and as a peeking edge tab on mobile — same peeking-tab
// pattern as RulesReferencePanel's "Reference" tab. `stacked` positions the
// tab below that other tab (Love Letter, which has both); omit it for
// games with only this one tab (A Little Wordy).
export function FullRulesButton({ title, children, stacked }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button $fullWidth className="full-rules-desktop-button" onClick={() => setOpen(true)}>
        📖 Full Rules
      </Button>

      <button
        className={`full-rules-tab${stacked ? ' full-rules-tab--stacked' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open full rules"
      >
        Rules
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} wide>
          <div className="full-rules-modal__close-row">
            <button
              className="full-rules-modal__close-button"
              onClick={() => setOpen(false)}
              aria-label="Close full rules"
            >
              ✕
            </button>
          </div>
          <div className="full-rules-modal__title">{title}</div>
          <div className="full-rules-modal__scroll-area">{children}</div>
        </Modal>
      )}
    </>
  );
}
