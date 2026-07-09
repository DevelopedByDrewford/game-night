import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { PlayingCard } from './PlayingCard.jsx';
import { Button } from '../ui/Button.jsx';
import { frontImageFor } from '../../utils/cardArt.js';
import { parseLogEntry } from '../../utils/turnLog.js';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// Sits over just the opponents/turn area on desktop (its positioned parent
// is TableTop in ActiveTableContainer), but goes full-page on mobile — same
// breakpoint as the rest of the table layout.
const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 15;
  background: rgba(20, 14, 8, 0.55);
  border-radius: ${({ theme }) => theme.radii.cardSm};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  @media (max-width: 640px) {
    position: fixed;
    border-radius: 0;
    z-index: 30;
  }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  animation: ${fadeInUp} 0.28s ease-out;
`;

const Progress = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(46, 32, 19, 0.45);
  margin-bottom: 14px;
`;

const CardPreview = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
`;

const AnnouncementText = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 19px;
  color: #2e2013;
  line-height: 1.4;
  margin: 20px 0 24px;
`;

const SentenceText = styled.div`
  font-size: 15px;
  line-height: 1.5;
  color: #2e2013;
  margin-bottom: 22px;
`;

const NavRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`;

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
    <Backdrop onClick={onSkip}>
      <Panel key={parsed.id} onClick={(e) => e.stopPropagation()}>
        <Progress>
          TURN {index + 1} OF {entries.length}
        </Progress>

        {parsed.kind === 'turn' ? (
          <>
            <CardPreview>
              <PlayingCard
                width={140}
                height={196}
                radius={14}
                stripeSize={10}
                label={parsed.cardName}
                frontImageUrl={frontImageFor(parsed.cardId)}
              />
            </CardPreview>
            <SentenceText>
              {parsed.before}
              <strong>{parsed.cardName}</strong>
              {parsed.after}
            </SentenceText>
          </>
        ) : (
          <AnnouncementText>{parsed.message}</AnnouncementText>
        )}

        <NavRow>
          <Button $variant="outline" onClick={onPrevious} disabled={isFirst}>
            ◀ Previous
          </Button>
          <Button onClick={onNext}>{isLast ? 'Done' : 'Next ▶'}</Button>
          {!isLast && (
            <Button $variant="outline" onClick={onSkip}>
              Skip
            </Button>
          )}
        </NavRow>
      </Panel>
    </Backdrop>
  );
}
