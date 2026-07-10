import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { PsycheBoard } from '../components/sideEffects/PsycheBoard.jsx';
import { PsycheCard } from '../components/sideEffects/PsycheCard.jsx';
import { CardCarouselModal } from '../components/sideEffects/CardCarouselModal.jsx';
import { PlayingCard } from '../components/game/PlayingCard.jsx';
import { ActionLogPanel } from '../components/game/ActionLogPanel.jsx';
import { TurnReviewOverlay } from '../components/game/TurnReviewOverlay.jsx';
import { FullRulesButton } from '../components/game/FullRulesButton.jsx';
import { SideEffectsRules } from '../components/game/SideEffectsRules.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRoomState } from '../hooks/useRoomState.js';
import { useHand } from '../hooks/useHand.js';
import { useRoomLog } from '../hooks/useRoomLog.js';
import { useRoomPresenceMap } from '../hooks/useRoomPresenceMap.js';
import { endGameEarly } from '../utils/rooms.js';
import { playAction, endTurn } from '../utils/sideEffectsGameplay.js';
import { colorForId } from '../utils/colors.js';
import { CARD_DEFS, cardName, cardType, cardDescription, vulnerableDisorders } from '../utils/sideEffectsCards.js';
import { frontImageFor } from '../utils/sideEffectsCardArt.js';
import { roomLabel } from '../utils/roomLabel.js';
import './SideEffectsTableContainer.css';

// Matches PsycheCard's sizing var so hand cards and Psyche cards stay the
// same size — set on .side-effects-table-layout in
// SideEffectsTableContainer.css, larger on desktop than mobile.
const HAND_CARD_WIDTH = 'var(--se-card-width, 78px)';
const HAND_CARD_HEIGHT = 'var(--se-card-height, 131px)';

// Enlarged size for the fullscreen card carousel — fixed rather than the
// --se-card-width var since this should stay big regardless of the table's
// own responsive card sizing.
const CAROUSEL_CARD_WIDTH = 220;
const CAROUSEL_CARD_HEIGHT = 369;

export function SideEffectsTableContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, loading: stateLoading } = useRoomState(room.id);
  const { hand, loading: handLoading } = useHand(room.id, user.uid);
  const { entries } = useRoomLog(room.id);
  const presence = useRoomPresenceMap(room.id);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [actionDraft, setActionDraft] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [ending, setEnding] = useState(false);
  const [discardPickerOpen, setDiscardPickerOpen] = useState(false);
  const [discardSelection, setDiscardSelection] = useState([]);
  // { kind: 'hand' } | { kind: 'psyche', uid } | null — which fullscreen
  // card carousel (if any) is open, and starting index within it.
  const [carousel, setCarousel] = useState(null);

  // Turn review — same lastSeenSeq/localStorage mechanism as the other two
  // games' table containers.
  const lastSeenKey = `side-effects:lastSeenLogSeq:${room.id}`;
  const [lastSeenSeq, setLastSeenSeq] = useState(() => {
    const stored = localStorage.getItem(lastSeenKey);
    return stored === null ? null : Number(stored);
  });
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    if (lastSeenSeq !== null || entries.length === 0) return;
    const maxSeq = entries[entries.length - 1].seq;
    setLastSeenSeq(maxSeq);
    localStorage.setItem(lastSeenKey, String(maxSeq));
  }, [entries, lastSeenSeq, lastSeenKey]);

  const isHost = user?.uid === room.hostUid;

  if (stateLoading || handLoading || !state) {
    return (
      <>
        <RoomChromeHeader title={roomLabel(room)} />
        <div className="table-status-text">Loading table…</div>
      </>
    );
  }

  const myTurn = state.turnUid === user.uid && state.phase === 'playing';
  const movesRemaining = 2 - (state.movesThisTurn || 0);
  const myPsyche = state.psyches[user.uid] || [];
  const otherPlayers = room.players.filter((p) => p.uid !== user.uid);
  const nameForUid = (uid) => room.players.find((p) => p.uid === uid)?.displayName || 'A player';

  function closeActionModal() {
    setSelectedCardId(null);
    setActionDraft({});
  }

  async function submitAction(args) {
    setSubmitting(true);
    setMessage(null);
    try {
      await playAction({ roomId: room.id, ...args });
      closeActionModal();
    } catch (err) {
      console.error('[SideEffectsTableContainer] playAction failed', err);
      setMessage({ text: err.message || "Couldn't play that card — try again.", error: true });
    } finally {
      setSubmitting(false);
    }
  }

  // Opens the target/action picker directly (used by the carousel's "Play
  // This Card" button, and by the discard-picker's card cap flow) — the
  // carousel itself is purely a browse layer, this is the actual play step.
  function handleHandCardClick(cardId) {
    if (!myTurn || submitting || movesRemaining <= 0 || selectedCardId) return;
    setCarousel(null);
    setSelectedCardId(cardId);
    setActionDraft({});
  }

  function openHandCarousel(index) {
    if (submitting) return;
    setCarousel({ kind: 'hand', startIndex: index });
  }

  function openPsycheCarousel(uid, index) {
    if (submitting) return;
    setCarousel({ kind: 'psyche', uid, startIndex: index });
  }

  function closeCarousel() {
    setCarousel(null);
  }

  async function runEndTurn(discardCardIds) {
    setSubmitting(true);
    setMessage(null);
    try {
      await endTurn({ roomId: room.id, discardCardIds });
      setDiscardPickerOpen(false);
      setDiscardSelection([]);
    } catch (err) {
      console.error('[SideEffectsTableContainer] endTurn failed', err);
      setMessage({ text: err.message || "Couldn't end your turn — try again.", error: true });
    } finally {
      setSubmitting(false);
    }
  }

  function handleEndTurn() {
    if (hand.length > 6) {
      setDiscardSelection([]);
      setDiscardPickerOpen(true);
      return;
    }
    runEndTurn([]);
  }

  function toggleDiscardCard(cardId, index) {
    const key = `${cardId}-${index}`;
    setDiscardSelection((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleEndGameEarly() {
    setEnding(true);
    try {
      await endGameEarly({ roomId: room.id });
      navigate('/dashboard');
    } catch (err) {
      console.error('[SideEffectsTableContainer] failed to end game', err);
      setEnding(false);
    }
  }

  function closeReview() {
    const maxSeq = entries.length ? entries[entries.length - 1].seq : lastSeenSeq;
    setLastSeenSeq(maxSeq);
    localStorage.setItem(lastSeenKey, String(maxSeq));
    setReviewIndex(0);
  }

  function handleReviewNext() {
    if (reviewIndex < pendingEntries.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      closeReview();
    }
  }

  function handleReviewPrevious() {
    setReviewIndex((i) => Math.max(0, i - 1));
  }

  const pendingEntries = lastSeenSeq === null ? [] : entries.filter((e) => e.seq > lastSeenSeq);
  const reviewIndexClamped = Math.min(reviewIndex, Math.max(0, pendingEntries.length - 1));

  function renderActionModalBody() {
    const cardId = selectedCardId;
    const def = CARD_DEFS[cardId];
    if (!def) return null;

    if (def.type === 'drug') {
      const disorderId = def.treats;
      const entry = myPsyche.find((e) => e.disorderId === disorderId);
      const eligible = entry && !entry.drugId;
      return (
        <>
          <div className="side-effects-modal-title">{def.name}</div>
          <div className="side-effects-modal-desc">Treats: {cardName(disorderId)}</div>
          {eligible ? (
            <Button onClick={() => submitAction({ actionType: 'treat', cardId })} disabled={submitting}>
              Treat {cardName(disorderId)}
            </Button>
          ) : (
            <div className="side-effects-modal-desc">
              {entry ? `${cardName(disorderId)} is already treated.` : `You don't have ${cardName(disorderId)} in your Psyche.`}
            </div>
          )}
        </>
      );
    }

    if (def.type === 'therapy') {
      const options = myPsyche.filter((e) => e.disorderId !== 'tremors');
      return (
        <>
          <div className="side-effects-modal-title">{def.name}</div>
          {options.length === 0 ? (
            <div className="side-effects-modal-desc">You have nothing Therapy can treat right now.</div>
          ) : (
            <div className="side-effects-picker-list">
              {options.map((e) => (
                <Button
                  key={e.disorderId}
                  $variant="outline"
                  onClick={() => submitAction({ actionType: 'therapy', cardId, ownDisorderId: e.disorderId })}
                  disabled={submitting}
                >
                  Discard {cardName(e.disorderId)}
                </Button>
              ))}
            </div>
          )}
        </>
      );
    }

    if (def.type === 'disorder') {
      const targets = otherPlayers.filter((p) => {
        const psyche = state.psyches[p.uid] || [];
        return vulnerableDisorders(psyche).has(cardId) && !psyche.some((e) => e.disorderId === cardId);
      });
      return (
        <>
          <div className="side-effects-modal-title">Give {def.name}</div>
          {targets.length === 0 ? (
            <div className="side-effects-modal-desc">No one is currently vulnerable to {def.name}.</div>
          ) : (
            <div className="side-effects-picker-list">
              {targets.map((p) => (
                <Button
                  key={p.uid}
                  $variant="outline"
                  onClick={() => submitAction({ actionType: 'giveDisorder', cardId, targetUid: p.uid })}
                  disabled={submitting}
                >
                  {p.displayName}
                </Button>
              ))}
            </div>
          )}
        </>
      );
    }

    if (def.type === 'episode') {
      if (!actionDraft.targetUid) {
        const targets = otherPlayers.filter((p) => (state.psyches[p.uid] || []).some((e) => !e.drugId));
        return (
          <>
            <div className="side-effects-modal-title">Play Episode</div>
            <div className="side-effects-modal-desc">Choose a player to target.</div>
            {targets.length === 0 ? (
              <div className="side-effects-modal-desc">No one has an untreated Disorder right now.</div>
            ) : (
              <div className="side-effects-picker-list">
                {targets.map((p) => (
                  <Button key={p.uid} $variant="outline" onClick={() => setActionDraft({ targetUid: p.uid })} disabled={submitting}>
                    {p.displayName}
                  </Button>
                ))}
              </div>
            )}
          </>
        );
      }
      const untreated = (state.psyches[actionDraft.targetUid] || []).filter((e) => !e.drugId);
      return (
        <>
          <div className="side-effects-modal-title">Play Episode on {nameForUid(actionDraft.targetUid)}</div>
          <div className="side-effects-picker-list">
            {untreated.map((e) => (
              <Button
                key={e.disorderId}
                $variant="outline"
                onClick={() =>
                  submitAction({ actionType: 'episode', cardId, targetUid: actionDraft.targetUid, targetDisorderId: e.disorderId })
                }
                disabled={submitting}
              >
                {cardName(e.disorderId)}
              </Button>
            ))}
          </div>
          <Button $variant="outline" onClick={() => setActionDraft({})} disabled={submitting}>
            ← Choose a different player
          </Button>
        </>
      );
    }

    if (cardId === 'misdiagnosis') {
      if (!actionDraft.ownDisorderId) {
        return (
          <>
            <div className="side-effects-modal-title">Misdiagnosis</div>
            <div className="side-effects-modal-desc">Choose one of your Disorders to swap out.</div>
            <div className="side-effects-picker-list">
              {myPsyche.map((e) => (
                <Button
                  key={e.disorderId}
                  $variant="outline"
                  onClick={() => setActionDraft({ ownDisorderId: e.disorderId })}
                  disabled={submitting}
                >
                  {cardName(e.disorderId)}
                </Button>
              ))}
            </div>
          </>
        );
      }
      const handDisorders = hand.filter((c) => cardType(c) === 'disorder');
      return (
        <>
          <div className="side-effects-modal-title">Swap in from your hand</div>
          {handDisorders.length === 0 ? (
            <div className="side-effects-modal-desc">You don't have a Disorder card in hand to swap in.</div>
          ) : (
            <div className="side-effects-picker-list">
              {handDisorders.map((c, i) => (
                <Button
                  key={`${c}-${i}`}
                  $variant="outline"
                  onClick={() =>
                    submitAction({ actionType: 'misdiagnosis', cardId, ownDisorderId: actionDraft.ownDisorderId, handDisorderId: c })
                  }
                  disabled={submitting}
                >
                  {cardName(c)}
                </Button>
              ))}
            </div>
          )}
          <Button $variant="outline" onClick={() => setActionDraft({})} disabled={submitting}>
            ← Choose a different Disorder
          </Button>
        </>
      );
    }

    if (cardId === 'highTolerance') {
      if (!actionDraft.targetUid) {
        const targets = otherPlayers.filter((p) => (state.psyches[p.uid] || []).some((e) => e.drugId));
        return (
          <>
            <div className="side-effects-modal-title">High Tolerance</div>
            <div className="side-effects-modal-desc">Choose a player to remove a treatment from.</div>
            {targets.length === 0 ? (
              <div className="side-effects-modal-desc">No one is currently treated.</div>
            ) : (
              <div className="side-effects-picker-list">
                {targets.map((p) => (
                  <Button key={p.uid} $variant="outline" onClick={() => setActionDraft({ targetUid: p.uid })} disabled={submitting}>
                    {p.displayName}
                  </Button>
                ))}
              </div>
            )}
          </>
        );
      }
      const treated = (state.psyches[actionDraft.targetUid] || []).filter((e) => e.drugId);
      return (
        <>
          <div className="side-effects-modal-title">Remove a treatment from {nameForUid(actionDraft.targetUid)}</div>
          <div className="side-effects-picker-list">
            {treated.map((e) => (
              <Button
                key={e.disorderId}
                $variant="outline"
                onClick={() =>
                  submitAction({
                    actionType: 'highTolerance',
                    cardId,
                    targetUid: actionDraft.targetUid,
                    targetDisorderId: e.disorderId,
                  })
                }
                disabled={submitting}
              >
                {cardName(e.disorderId)} ({cardName(e.drugId)})
              </Button>
            ))}
          </div>
          <Button $variant="outline" onClick={() => setActionDraft({})} disabled={submitting}>
            ← Choose a different player
          </Button>
        </>
      );
    }

    return null;
  }

  if (state.phase === 'gameEnd') {
    return (
      <>
        <RoomChromeHeader title={roomLabel(room)} showEndGameEarly={isHost} onEndGameEarly={handleEndGameEarly} />
        <div className="side-effects-table-layout">
          <div className="side-effects-table-panel">
            <div className="side-effects-table-panel__title">
              {state.winnerUid === user.uid ? 'You won!' : `${nameForUid(state.winnerUid)} won.`}
            </div>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <RoomChromeHeader title={roomLabel(room)} showEndGameEarly={isHost} onEndGameEarly={handleEndGameEarly} />
      <div className="side-effects-table-layout">
        <div className="side-effects-table-column">
          <div className="side-effects-table-top">
            <div className="side-effects-turn-indicator">
              {myTurn ? '▶ Your turn' : `▶ ${nameForUid(state.turnUid)}'s turn`}
              {myTurn && ` — ${movesRemaining} move(s) left`}
            </div>

            {pendingEntries.length > 0 && (
              <TurnReviewOverlay
                entries={pendingEntries}
                index={reviewIndexClamped}
                room={room}
                viewerUid={user.uid}
                onPrevious={handleReviewPrevious}
                onNext={handleReviewNext}
                onSkip={closeReview}
              />
            )}
          </div>

          <div className="side-effects-psyche-grid">
            {room.players.map((p) => (
              <PsycheBoard
                key={p.uid}
                name={p.uid === user.uid ? `${p.displayName} (you)` : p.displayName}
                color={colorForId(p.uid)}
                online={Boolean(presence[p.uid])}
                isCurrentTurn={state.turnUid === p.uid}
                psyche={state.psyches[p.uid] || []}
                onCardClick={(index) => openPsycheCarousel(p.uid, index)}
              />
            ))}
          </div>

          <div className="side-effects-hand-panel">
            <div className="side-effects-hand-label">YOUR HAND — PRIVATE</div>
            <div className="side-effects-hand-cards">
              {hand.map((cardId, i) => (
                <PlayingCard
                  key={`${cardId}-${i}`}
                  width={HAND_CARD_WIDTH}
                  height={HAND_CARD_HEIGHT}
                  radius={10}
                  stripe="#C8592F"
                  label={cardName(cardId)}
                  frontImageUrl={frontImageFor(cardId)}
                  onClick={() => openHandCarousel(i)}
                  style={{ cursor: submitting ? 'default' : 'pointer' }}
                />
              ))}
            </div>
            {myTurn && (
              <Button $variant="outline" onClick={handleEndTurn} disabled={submitting} style={{ marginTop: 12 }}>
                End Turn
              </Button>
            )}
            {message && (
              <div className={`side-effects-message-text${message.error ? ' side-effects-message-text--error' : ''}`}>
                {message.text}
              </div>
            )}
          </div>
        </div>

        <div className="side-effects-side-column">
          <ActionLogPanel entries={entries} />
          <FullRulesButton title="Side Effects — Rules">
            <SideEffectsRules />
          </FullRulesButton>
        </div>
      </div>

      {carousel && (
        <CardCarouselModal
          items={carousel.kind === 'hand' ? hand : state.psyches[carousel.uid] || []}
          startIndex={carousel.startIndex}
          cardWidth={CAROUSEL_CARD_WIDTH}
          onClose={closeCarousel}
          title={carousel.kind === 'hand' ? 'Your Hand' : `${nameForUid(carousel.uid)}'s Psyche`}
          renderCard={(item) =>
            carousel.kind === 'hand' ? (
              <PlayingCard
                width={CAROUSEL_CARD_WIDTH}
                height={CAROUSEL_CARD_HEIGHT}
                radius={16}
                stripe="#C8592F"
                label={cardName(item)}
                frontImageUrl={frontImageFor(item)}
              />
            ) : (
              <PsycheCard entry={item} width={CAROUSEL_CARD_WIDTH} height={CAROUSEL_CARD_HEIGHT} large />
            )
          }
          renderDescription={(item) => cardDescription(carousel.kind === 'hand' ? item : item.disorderId)}
          renderActions={
            carousel.kind === 'hand'
              ? (item) =>
                  myTurn && movesRemaining > 0 ? (
                    <Button onClick={() => handleHandCardClick(item)} disabled={submitting}>
                      Play This Card
                    </Button>
                  ) : null
              : undefined
          }
        />
      )}

      {selectedCardId && (
        <Modal onClose={closeActionModal}>
          {renderActionModalBody()}
          <Button $variant="outline" onClick={closeActionModal} disabled={submitting} style={{ marginTop: 12 }}>
            Cancel
          </Button>
        </Modal>
      )}

      {discardPickerOpen && (
        <Modal onClose={() => setDiscardPickerOpen(false)}>
          <div className="side-effects-modal-title">Choose {hand.length - 6} card(s) to discard</div>
          <div className="side-effects-modal-desc">Your hand is over the 6-card limit.</div>
          <div className="side-effects-discard-grid">
            {hand.map((cardId, i) => {
              const key = `${cardId}-${i}`;
              const selected = discardSelection.includes(key);
              return (
                <PlayingCard
                  key={key}
                  width={64}
                  height={107}
                  radius={8}
                  stripe={selected ? '#7C8C4A' : '#C8592F'}
                  label={cardName(cardId)}
                  frontImageUrl={frontImageFor(cardId)}
                  onClick={() => toggleDiscardCard(cardId, i)}
                  style={{ cursor: 'pointer', opacity: selected ? 0.5 : 1 }}
                />
              );
            })}
          </div>
          <div className="side-effects-modal-actions">
            <Button
              onClick={() => runEndTurn(discardSelection.map((key) => key.slice(0, key.lastIndexOf('-'))))}
              disabled={submitting || discardSelection.length !== hand.length - 6}
            >
              Discard &amp; End Turn
            </Button>
            <Button $variant="outline" onClick={() => setDiscardPickerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
