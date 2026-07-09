import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { OpponentSeat } from '../components/game/OpponentSeat.jsx';
import { PlayingCard } from '../components/game/PlayingCard.jsx';
import { DiscardPileRow } from '../components/game/DiscardPileRow.jsx';
import { DiscardsModal } from '../components/game/DiscardsModal.jsx';
import { ActionLogPanel } from '../components/game/ActionLogPanel.jsx';
import { RulesReferencePanel } from '../components/game/RulesReferencePanel.jsx';
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

const Layout = styled.div`
  max-width: ${({ theme }) => theme.maxWidth.grid};
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    padding-bottom: 90px;
  }
`;

const TableColumn = styled.div`
  flex: 2;
  min-width: 420px;
`;

const Opponents = styled.div`
  display: flex;
  justify-content: space-around;
  margin-bottom: 22px;
  flex-wrap: wrap;
  gap: 14px;
`;

const TurnArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 22px 0;
`;

const TurnIndicator = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.terracotta};
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.terracotta};
`;

const DeckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DeckCount = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkFaint};
`;

const TokenCount = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

const HandPanel = styled.div`
  border: 3px solid ${({ theme }) => theme.colors.terracotta};
  background: #fdf0e5;
  border-radius: 18px;
  padding: 16px;
  margin-top: 16px;
`;

const HandLabel = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.terracotta};
  letter-spacing: 1px;
  margin-bottom: 10px;
`;

const HandCards = styled.div`
  display: flex;
  gap: 12px;
`;

const MyDiscardWrap = styled.div`
  margin-top: 14px;
`;

const PickerTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 10px;
  color: #2e2013;
`;

const PickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
`;

const ModalCardPreview = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
`;

const ModalCardName = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 24px;
  color: #2e2013;
  margin-bottom: 8px;
`;

const ModalCardDescription = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: rgba(46, 32, 19, 0.75);
  margin-bottom: 22px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const MessageText = styled.div`
  font-size: 13px;
  margin-top: 10px;
  color: ${({ theme, $error }) => ($error ? theme.colors.terracotta : theme.colors.avocado)};
`;

const StatusText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

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

  const isHost = user?.uid === room.hostUid;

  if (stateLoading || handLoading || !state) {
    return (
      <>
        <RoomChromeHeader title={`Room ${room.code}`} />
        <StatusText>Loading table…</StatusText>
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

  return (
    <>
      <RoomChromeHeader
        title={`Room ${room.code}`}
        showEndGameEarly={isHost}
        onEndGameEarly={handleEndGameEarly}
      />
      <Layout>
        <TableColumn>
          <Opponents>
            {opponents.map((op) => (
              <OpponentSeat key={op.name} {...op} />
            ))}
          </Opponents>

          <TurnArea>
            <TurnIndicator>
              {myChancellorPending
                ? '▶ Choose a card to keep…'
                : myTurn
                ? '▶ Your turn'
                : `▶ ${nameForUid(state.turnUid)}'s turn`}
            </TurnIndicator>
            <DeckRow>
              <PlayingCard width={44} height={60} radius={8} stripe="#7C8C4A" stripeSize={6} backImageUrl={backImageFor()} />
              <DeckCount>Deck: {state.deckCount} left</DeckCount>
            </DeckRow>
            <TokenCount>
              Round {state.roundNumber} · You: {myTokens}/{state.tokensToWin} tokens
            </TokenCount>
          </TurnArea>

          <HandPanel>
            <HandLabel>YOUR HAND — PRIVATE</HandLabel>

            {myChancellorPending && (
              <PickerTitle>Chancellor — choose 1 card to keep, the rest go to the bottom of the deck</PickerTitle>
            )}
            <HandCards>
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
            </HandCards>

            {message && <MessageText $error={message.error}>{message.text}</MessageText>}
          </HandPanel>

          <MyDiscardWrap>
            <DiscardPileRow discards={myDiscards} label="Your discard" onClick={() => setDiscardsModalOpen(true)} />
          </MyDiscardWrap>
        </TableColumn>

        <ActionLogPanel entries={entries.map((e) => e.message)} />
        <RulesReferencePanel ruleset={state.ruleset} />
      </Layout>

      {selectedCard && !pending && (
        <Modal onClose={handleCancelSelection}>
          <ModalCardPreview>
            <PlayingCard
              width={170}
              height={238}
              radius={16}
              stripeSize={12}
              stripe="#C8592F"
              label={cardName(selectedCard)}
              frontImageUrl={frontImageFor(selectedCard)}
            />
          </ModalCardPreview>
          <ModalCardName>{cardName(selectedCard)}</ModalCardName>
          <ModalCardDescription>{cardDescription(selectedCard)}</ModalCardDescription>
          <ModalActions>
            <Button onClick={handlePlaySelected} disabled={submitting}>
              Play
            </Button>
            <Button $variant="outline" onClick={handleCancelSelection} disabled={submitting}>
              Cancel
            </Button>
          </ModalActions>
        </Modal>
      )}

      {pending && !pending.targetUid && (
        <Modal onClose={handleCancelSelection}>
          <PickerTitle>Choose a target for {cardName(pending.cardId)}</PickerTitle>
          <PickerRow>
            {legalTargetsFor(pending.cardId).map((uid) => (
              <Button key={uid} $variant="outline" onClick={() => handleTargetPick(uid)}>
                {uid === user.uid ? 'Yourself' : nameForUid(uid)}
              </Button>
            ))}
          </PickerRow>
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
          <PickerTitle>Guess {nameForUid(pending.targetUid)}'s card</PickerTitle>
          <PickerRow>
            {Object.keys(CARD_DEFS)
              .filter((id) => id !== 'guard')
              .map((id) => (
                <Button key={id} $variant="outline" onClick={() => handleGuessPick(id)}>
                  {cardName(id)}
                </Button>
              ))}
          </PickerRow>
          <Button $variant="outline" onClick={handleCancelSelection}>
            Cancel
          </Button>
        </Modal>
      )}
    </>
  );
}
