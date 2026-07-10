import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { OpponentSeat } from '../components/game/OpponentSeat.jsx';
import { PlayingCard } from '../components/game/PlayingCard.jsx';
import { DiscardPileRow } from '../components/game/DiscardPileRow.jsx';
import { DiscardsModal } from '../components/game/DiscardsModal.jsx';
import { TurnReviewOverlay } from '../components/game/TurnReviewOverlay.jsx';
import { ActionLogPanel } from '../components/game/ActionLogPanel.jsx';
import { RulesReferencePanel } from '../components/game/RulesReferencePanel.jsx';
import { FullRulesButton } from '../components/game/FullRulesButton.jsx';
import { LoveLetterRules } from '../components/game/LoveLetterRules.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRoomState } from '../hooks/useRoomState.js';
import { useHand } from '../hooks/useHand.js';
import { useRoomLog } from '../hooks/useRoomLog.js';
import { useRoomPresenceMap } from '../hooks/useRoomPresenceMap.js';
import { endGameEarly } from '../utils/rooms.js';
import { playCard, resolveChancellor } from '../utils/gameplay.js';
import { colorForId } from '../utils/colors.js';
import { CARD_DEFS, TARGETED_CARDS, cardName, cardDescription } from '../utils/cards.js';
import { frontImageFor, backImageFor } from '../utils/cardArt.js';
import { roomLabel } from '../utils/roomLabel.js';
import './ActiveTableContainer.css';

export function ActiveTableContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, loading: stateLoading } = useRoomState(room.id);
  const { hand, loading: handLoading } = useHand(room.id, user.uid);
  const { entries } = useRoomLog(room.id);
  const presence = useRoomPresenceMap(room.id);

  const [selectedCard, setSelectedCard] = useState(null); // cardId clicked in hand, modal open
  const [pending, setPending] = useState(null); // { cardId, targetUid? } — set once "Play" is confirmed
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }
  const [ending, setEnding] = useState(false);
  const [discardsModalOpen, setDiscardsModalOpen] = useState(false);

  // Turn review: `lastSeenSeq` (persisted per room in localStorage so a
  // page refresh doesn't replay the whole game) marks everything the
  // player has already reviewed. Anything newer is queued up for the
  // TurnReviewOverlay — usually just the turn that was just played, but
  // can be several if they were away, hence Previous/Next/Skip.
  const lastSeenKey = `love-letter:lastSeenLogSeq:${room.id}`;
  const [lastSeenSeq, setLastSeenSeq] = useState(() => {
    const stored = localStorage.getItem(lastSeenKey);
    return stored === null ? null : Number(stored);
  });
  const [reviewIndex, setReviewIndex] = useState(0);

  // First time this room's log ever loads with no stored `lastSeenSeq`,
  // treat everything already there as seen (a fresh join shouldn't replay
  // the whole game's history) — only entries appended after this point
  // queue up for review.
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
  const myChancellorPending = state.phase === 'chancellorPending' && state.turnUid === user.uid;
  const nameForUid = (uid) => room.players.find((p) => p.uid === uid)?.displayName || 'A player';

  function legalTargetsFor(cardId) {
    const aliveUids = state.turnOrder.filter((u) => !state.eliminated[u]);
    const protectedUids = new Set(aliveUids.filter((u) => state.protected[u]));
    const others = aliveUids.filter((u) => u !== user.uid && !protectedUids.has(u));
    if (cardId === 'prince') return [...others, user.uid];
    if (TARGETED_CARDS.includes(cardId)) return others;
    return [];
  }

  async function submitPlay(args) {
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await playCard({ roomId: room.id, ...args });
      if (result.peekedCard) {
        setMessage({ text: `You saw: ${cardName(result.peekedCard)}`, error: false });
      }
    } catch (err) {
      console.error('[ActiveTableContainer] playCard failed', err);
      setMessage({ text: err.message || "Couldn't play that card — try again.", error: true });
    } finally {
      setSubmitting(false);
      setPending(null);
      setSelectedCard(null);
    }
  }

  // Clicking a hand card just opens the preview modal — playing it (and,
  // for targeted cards, picking a target) happens from there.
  function handleCardClick(cardId) {
    if (!myTurn || hand.length < 2 || submitting || selectedCard) return;
    setSelectedCard(cardId);
  }

  function handleCancelSelection() {
    setSelectedCard(null);
    setPending(null);
  }

  // "Play" in the modal: untargeted cards (or targeted cards with no legal
  // target left, i.e. a fizzle) submit immediately; otherwise the modal
  // switches to the target picker.
  function handlePlaySelected() {
    const cardId = selectedCard;
    if (!TARGETED_CARDS.includes(cardId)) {
      submitPlay({ cardId, targetUid: null, guessCardId: null });
      return;
    }

    const targets = legalTargetsFor(cardId);
    if (targets.length === 0) {
      submitPlay({ cardId, targetUid: null, guessCardId: null });
      return;
    }

    setPending({ cardId, targetUid: null });
  }

  function handleTargetPick(targetUid) {
    if (pending.cardId === 'guard') {
      setPending({ ...pending, targetUid });
    } else {
      submitPlay({ cardId: pending.cardId, targetUid, guessCardId: null });
    }
  }

  function handleGuessPick(guessCardId) {
    submitPlay({ cardId: 'guard', targetUid: pending.targetUid, guessCardId });
  }

  async function handleKeepCard(keepCardId) {
    setSubmitting(true);
    setMessage(null);
    try {
      await resolveChancellor({ roomId: room.id, keepCardId });
    } catch (err) {
      console.error('[ActiveTableContainer] resolveChancellor failed', err);
      setMessage({ text: err.message || "Couldn't resolve Chancellor — try again.", error: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndGameEarly() {
    setEnding(true);
    try {
      await endGameEarly({ roomId: room.id });
      navigate('/dashboard');
    } catch (err) {
      console.error('[ActiveTableContainer] failed to end game', err);
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

  const opponents = room.players
    .filter((p) => p.uid !== user.uid)
    .map((p) => {
      const eliminated = Boolean(state.eliminated[p.uid]);
      const protectedFlag = Boolean(state.protected[p.uid]);
      const online = Boolean(presence[p.uid]);
      const tokens = state.tokens[p.uid] || 0;
      const choosing = state.phase === 'chancellorPending' && state.turnUid === p.uid;
      const statusLabel = choosing
        ? 'Choosing…'
        : eliminated
        ? 'Eliminated'
        : protectedFlag
        ? 'Protected'
        : online
        ? 'Online'
        : 'Offline';
      return {
        name: p.displayName,
        color: colorForId(p.uid),
        online,
        statusLabel: `${statusLabel} · ${tokens} tok`,
        discards: state.discardPiles[p.uid] || [],
        isCurrentTurn: state.turnUid === p.uid,
        onDiscardClick: () => setDiscardsModalOpen(true),
      };
    });

  const myTokens = state.tokens[user.uid] || 0;
  const myDiscards = state.discardPiles[user.uid] || [];
  const allDiscardPlayers = room.players.map((p) => ({
    uid: p.uid,
    name: p.displayName,
    discards: state.discardPiles[p.uid] || [],
    isYou: p.uid === user.uid,
  }));

  const pendingEntries = lastSeenSeq === null ? [] : entries.filter((e) => e.seq > lastSeenSeq);
  const reviewIndexClamped = Math.min(reviewIndex, Math.max(0, pendingEntries.length - 1));

  return (
    <>
      <RoomChromeHeader
        title={roomLabel(room)}
        showEndGameEarly={isHost}
        onEndGameEarly={handleEndGameEarly}
      />
      <div className="table-layout">
        <div className="table-column">
          <div className="table-top">
            <div className="table-opponents">
              {opponents.map((op) => (
                <OpponentSeat key={op.name} {...op} />
              ))}
            </div>

            <div className="table-turn-area">
              <div className="table-turn-indicator">
                {myChancellorPending
                  ? '▶ Choose a card to keep…'
                  : myTurn
                  ? '▶ Your turn'
                  : `▶ ${nameForUid(state.turnUid)}'s turn`}
              </div>
              <div className="table-deck-row">
                <PlayingCard width={44} height={60} radius={8} stripe="#7C8C4A" stripeSize={6} backImageUrl={backImageFor()} />
                <div className="table-deck-count">Deck: {state.deckCount} left</div>
              </div>
              <div className="table-token-count">
                Round {state.roundNumber} · You: {myTokens}/{state.tokensToWin} tokens
              </div>
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

          <div className="table-hand-panel">
            <div className="table-hand-label">YOUR HAND — PRIVATE</div>

            {myChancellorPending && (
              <div className="table-picker-title">
                Chancellor — choose 1 card to keep, the rest go to the bottom of the deck
              </div>
            )}
            <div className="table-hand-cards">
              {hand.map((cardId, i) => (
                <PlayingCard
                  key={`${cardId}-${i}`}
                  stripe="#C8592F"
                  label={cardName(cardId)}
                  frontImageUrl={frontImageFor(cardId)}
                  onClick={() => (myChancellorPending ? !submitting && handleKeepCard(cardId) : handleCardClick(cardId))}
                  style={{
                    cursor:
                      (myChancellorPending && !submitting) || (myTurn && !submitting && !selectedCard)
                        ? 'pointer'
                        : 'default',
                  }}
                />
              ))}
            </div>

            {message && (
              <div className={`table-message-text${message.error ? ' table-message-text--error' : ''}`}>
                {message.text}
              </div>
            )}
          </div>

          <div className="table-my-discard">
            <DiscardPileRow discards={myDiscards} label="Your discard" onClick={() => setDiscardsModalOpen(true)} />
          </div>
        </div>

        <div className="table-side-column">
          <ActionLogPanel entries={entries} />
          <FullRulesButton title="Love Letter — Rules" stacked>
            <LoveLetterRules />
          </FullRulesButton>
        </div>
        <RulesReferencePanel ruleset={state.ruleset} />
      </div>

      {selectedCard && !pending && (
        <Modal onClose={handleCancelSelection}>
          <div className="table-modal-card-preview">
            <PlayingCard
              width={170}
              height={238}
              radius={16}
              stripeSize={12}
              stripe="#C8592F"
              label={cardName(selectedCard)}
              frontImageUrl={frontImageFor(selectedCard)}
            />
          </div>
          <div className="table-modal-card-name">{cardName(selectedCard)}</div>
          <div className="table-modal-card-description">{cardDescription(selectedCard)}</div>
          <div className="table-modal-actions">
            <Button onClick={handlePlaySelected} disabled={submitting}>
              Play
            </Button>
            <Button $variant="outline" onClick={handleCancelSelection} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {pending && !pending.targetUid && (
        <Modal onClose={handleCancelSelection}>
          <div className="table-picker-title">Choose a target for {cardName(pending.cardId)}</div>
          <div className="table-picker-row">
            {legalTargetsFor(pending.cardId).map((uid) => (
              <Button key={uid} $variant="outline" onClick={() => handleTargetPick(uid)}>
                {uid === user.uid ? 'Yourself' : nameForUid(uid)}
              </Button>
            ))}
          </div>
          <Button $variant="outline" onClick={handleCancelSelection}>
            Cancel
          </Button>
        </Modal>
      )}

      {discardsModalOpen && (
        <DiscardsModal players={allDiscardPlayers} onClose={() => setDiscardsModalOpen(false)} />
      )}

      {pending?.cardId === 'guard' && pending.targetUid && (
        <Modal onClose={handleCancelSelection}>
          <div className="table-picker-title">Guess {nameForUid(pending.targetUid)}'s card</div>
          <div className="table-picker-row">
            {Object.keys(CARD_DEFS)
              .filter((id) => id !== 'guard')
              .map((id) => (
                <Button key={id} $variant="outline" onClick={() => handleGuessPick(id)}>
                  {cardName(id)}
                </Button>
              ))}
          </div>
          <Button $variant="outline" onClick={handleCancelSelection}>
            Cancel
          </Button>
        </Modal>
      )}
    </>
  );
}
