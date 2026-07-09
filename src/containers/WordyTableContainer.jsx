import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { ActionLogPanel } from '../components/game/ActionLogPanel.jsx';
import { LetterTile } from '../components/wordy/LetterTile.jsx';
import { WordBuilder } from '../components/wordy/WordBuilder.jsx';
import { ClueCard } from '../components/wordy/ClueCard.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRoomState } from '../hooks/useRoomState.js';
import { useWordyHand } from '../hooks/useWordyHand.js';
import { useRoomLog } from '../hooks/useRoomLog.js';
import { useRoomPresenceMap } from '../hooks/useRoomPresenceMap.js';
import { endGameEarly } from '../utils/rooms.js';
import {
  submitSecretWord,
  activateClue,
  respondToRhyme,
  guessWord,
  submitTiebreakerWord,
} from '../utils/wordyGameplay.js';
import { colorForId } from '../utils/colors.js';
import { CLUE_DEFS, CLUE_ORDER, clueDescription } from '../utils/wordyClues.js';
import './WordyTableContainer.css';

// Clues that need extra input before they can be activated — everything
// else (last-letter, exact-word-length, first-letter, buy-a-vowel,
// give-and-take, vowel-count, consonant-count) fires immediately on click.
// rhyme-time also fires immediately (it's the *response* that needs input,
// handled separately once state.pendingClue is set — see wordyRules.js /
// wordyHandlers.js#respondToRhyme).
const CLUE_ARG_KIND = {
  'letter-strike': 'letter',
  'rare-find': 'letter',
  'burn-the-copies': 'letter',
  'super-strike': 'letter',
  'lets-share': 'letter',
  'relative-word-length': 'word',
  'word-builder': 'word',
  'dynamic-word-builder': 'word',
};

function uniqueLetters(tiles) {
  return [...new Set([...(tiles?.vowels || []), ...(tiles?.consonants || [])])].sort();
}

function flatLetters(tiles) {
  return [...(tiles?.vowels || []), ...(tiles?.consonants || [])];
}

export function WordyTableContainer({ room }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, loading: stateLoading } = useRoomState(room.id);
  const hand = useWordyHand(room.id, user.uid);
  const { entries } = useRoomLog(room.id);
  const presence = useRoomPresenceMap(room.id);

  const [wordInput, setWordInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [rhymeInput, setRhymeInput] = useState('');
  const [tiebreakerInput, setTiebreakerInput] = useState('');
  const [pendingClueId, setPendingClueId] = useState(null); // clue awaiting an arg via modal
  const [argValue, setArgValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }
  const [ending, setEnding] = useState(false);

  const isHost = user?.uid === room.hostUid;

  if (stateLoading || hand.loading || !state) {
    return (
      <>
        <RoomChromeHeader title={`Room ${room.code}`} />
        <div className="table-status-text">Loading table…</div>
      </>
    );
  }

  const opponentUid = state.turnOrder.find((uid) => uid !== user.uid);
  const opponent = room.players.find((p) => p.uid === opponentUid);
  const myTurn = state.turnUid === user.uid;
  const iAmPendingResponder = state.pendingClue && state.pendingClue.responderUid === user.uid;

  async function runAction(fn) {
    setSubmitting(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      console.error('[WordyTableContainer] action failed', err);
      setMessage({ text: err.message || "That didn't work — try again.", error: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitWord() {
    if (!wordInput) return;
    await runAction(async () => {
      await submitSecretWord({ roomId: room.id, word: wordInput });
    });
  }

  function handleClueClick(clueId) {
    if (!myTurn || submitting || state.pendingClue) return;
    const kind = CLUE_ARG_KIND[clueId];
    if (!kind) {
      runAction(() => activateClue({ roomId: room.id, clueId }));
      return;
    }
    setPendingClueId(clueId);
    setArgValue('');
  }

  async function handleConfirmArg() {
    const clueId = pendingClueId;
    const kind = CLUE_ARG_KIND[clueId];
    const args = kind === 'letter' ? { letter: argValue } : { builtWord: argValue };
    await runAction(async () => {
      await activateClue({ roomId: room.id, clueId, args });
      setPendingClueId(null);
      setArgValue('');
    });
  }

  async function handleGuess() {
    if (!guessInput) return;
    await runAction(async () => {
      await guessWord({ roomId: room.id, guess: guessInput });
    });
  }

  async function handleRhymeResponse(e) {
    e.preventDefault();
    if (!rhymeInput.trim()) return;
    await runAction(async () => {
      await respondToRhyme({ roomId: room.id, word: rhymeInput.trim() });
      setRhymeInput('');
    });
  }

  async function handleTiebreaker() {
    if (!tiebreakerInput) return;
    await runAction(async () => {
      await submitTiebreakerWord({ roomId: room.id, word: tiebreakerInput });
    });
  }

  async function handleEndGameEarly() {
    setEnding(true);
    try {
      await endGameEarly({ roomId: room.id });
      navigate('/dashboard');
    } catch (err) {
      console.error('[WordyTableContainer] failed to end game', err);
      setEnding(false);
    }
  }

  const opponentOnline = Boolean(presence[opponentUid]);
  const myTokens = state.tokens[user.uid] || 0;
  const opponentTokens = state.tokens[opponentUid] || 0;

  return (
    <>
      <RoomChromeHeader title={`Room ${room.code}`} showEndGameEarly={isHost} onEndGameEarly={handleEndGameEarly} />
      <div className="wordy-table-layout">
        <div className="wordy-table-column">
          <div className="wordy-table-opponent">
            <Avatar size={56} color={colorForId(opponentUid)} showStatus online={opponentOnline} />
            <div className="wordy-table-opponent__name">{opponent?.displayName || 'Opponent'}</div>
            <div className="wordy-table-opponent__status">
              {opponentOnline ? 'Online' : 'Offline'} · {opponentTokens} tokens
            </div>
          </div>

          {state.phase === 'wordSubmission' && (
            <div className="wordy-table-panel">
              <div className="wordy-table-panel__title">Build your Secret Word</div>
              {hand.secretWord ? (
                <div className="wordy-table-helper-text">
                  You locked in "{hand.secretWord}" — waiting for {opponent?.displayName || 'your opponent'}…
                </div>
              ) : (
                <>
                  <WordBuilder letters={flatLetters(hand.originalTiles)} onWordChange={setWordInput} disabled={submitting} tileSize={44} />
                  <div className="wordy-table-word-form">
                    <Button onClick={handleSubmitWord} disabled={submitting || !wordInput}>
                      Lock it in
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {state.phase === 'clueOrGuess' && (
            <>
              <div className="wordy-table-turn-indicator">
                {state.pendingClue
                  ? iAmPendingResponder
                    ? '▶ Rhyme Time — your response!'
                    : `▶ Waiting for ${opponent?.displayName || 'opponent'} to respond to Rhyme Time…`
                  : myTurn
                  ? '▶ Your turn'
                  : `▶ ${opponent?.displayName || "Opponent"}'s turn`}
              </div>
              <div className="wordy-table-token-count">
                You: {myTokens} tokens · {opponent?.displayName || 'Opponent'}: {opponentTokens} tokens
              </div>

              {(!myTurn || state.pendingClue) && (
                <div className="wordy-table-panel">
                  <div className="wordy-table-panel__title">Your tiles (guess with these)</div>
                  <div className="wordy-table-tile-row">
                    {hand.tilesInFront.vowels.map((l, i) => (
                      <LetterTile key={`v${i}`} letter={l} size={40} />
                    ))}
                    {hand.tilesInFront.consonants.map((l, i) => (
                      <LetterTile key={`c${i}`} letter={l} size={40} />
                    ))}
                  </div>
                </div>
              )}

              {iAmPendingResponder ? (
                <form className="wordy-table-word-form" onSubmit={handleRhymeResponse}>
                  <input
                    className="wordy-table-word-input"
                    value={rhymeInput}
                    onChange={(e) => setRhymeInput(e.target.value)}
                    placeholder="Say a word that rhymes with your Secret Word"
                    maxLength={40}
                    disabled={submitting}
                  />
                  <Button disabled={submitting || !rhymeInput.trim()}>Respond</Button>
                </form>
              ) : myTurn && !state.pendingClue ? (
                <>
                  <div className="wordy-table-panel">
                    <div className="wordy-table-panel__title">Activate a clue</div>
                    <div className="wordy-table-clue-grid">
                      {CLUE_ORDER.filter((id) => state.availableClues.includes(id)).map((id) => (
                        <ClueCard
                          key={id}
                          title={CLUE_DEFS[id].title}
                          category={CLUE_DEFS[id].category}
                          value={CLUE_DEFS[id].value}
                          onClick={() => handleClueClick(id)}
                          disabled={
                            submitting ||
                            ((id === 'lets-share' || id === 'give-and-take') && state.guessedCorrectly[user.uid])
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="wordy-table-panel">
                    <div className="wordy-table-panel__title">Or guess their Secret Word</div>
                    <WordBuilder letters={flatLetters(hand.tilesInFront)} onWordChange={setGuessInput} disabled={submitting} tileSize={40} />
                    <div className="wordy-table-word-form">
                      <Button onClick={handleGuess} disabled={submitting || !guessInput}>
                        Guess
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="wordy-table-helper-text">Waiting for {opponent?.displayName || 'opponent'}…</div>
              )}
            </>
          )}

          {state.phase === 'tiebreaker' && (
            <div className="wordy-table-panel">
              <div className="wordy-table-panel__title">Tiebreaker! Race to spell a new 4-letter word</div>
              <WordBuilder letters={flatLetters(hand.originalTiles)} onWordChange={setTiebreakerInput} disabled={submitting} tileSize={44} />
              <div className="wordy-table-word-form">
                <Button onClick={handleTiebreaker} disabled={submitting || tiebreakerInput.length !== 4}>
                  Submit
                </Button>
              </div>
            </div>
          )}

          {state.phase === 'completed' && (
            <div className="wordy-table-panel">
              <div className="wordy-table-panel__title">
                {state.winnerUid === user.uid ? 'You won!' : `${opponent?.displayName || 'Opponent'} won.`}
              </div>
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          )}

          {message && (
            <div className={`wordy-table-message-text${message.error ? ' wordy-table-message-text--error' : ''}`}>
              {message.text}
            </div>
          )}
        </div>

        <ActionLogPanel entries={entries} />
      </div>

      {pendingClueId && (
        <Modal onClose={() => setPendingClueId(null)}>
          <div className="wordy-table-panel__title">{CLUE_DEFS[pendingClueId].title}</div>
          <div className="wordy-table-clue-description">{clueDescription(pendingClueId)}</div>

          {CLUE_ARG_KIND[pendingClueId] === 'letter' ? (
            <div className="wordy-table-letter-picker">
              {uniqueLetters(hand.tilesInFront).map((letter) => (
                <LetterTile
                  key={letter}
                  letter={letter}
                  size={40}
                  selected={argValue === letter}
                  onClick={() => setArgValue(letter)}
                />
              ))}
            </div>
          ) : (
            <WordBuilder letters={flatLetters(hand.tilesInFront)} onWordChange={setArgValue} disabled={submitting} tileSize={40} />
          )}

          <div className="wordy-table-modal-actions">
            <Button onClick={handleConfirmArg} disabled={submitting || !argValue}>
              Confirm
            </Button>
            <Button $variant="outline" onClick={() => setPendingClueId(null)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
