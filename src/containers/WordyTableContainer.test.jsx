import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { WordyTableContainer } from './WordyTableContainer.jsx';
import {
  submitSecretWord,
  activateClue,
  respondToRhyme,
  guessWord,
  submitTiebreakerWord,
} from '../utils/wordyGameplay.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }));
vi.mock('../hooks/useRoomPresenceMap.js', () => ({ useRoomPresenceMap: () => ({ opp: true }) }));
let fakeEntries = [];
vi.mock('../hooks/useRoomLog.js', () => ({ useRoomLog: () => ({ entries: fakeEntries, loading: false }) }));
vi.mock('../utils/rooms.js', () => ({ endGameEarly: vi.fn() }));
vi.mock('../utils/wordyGameplay.js', () => ({
  submitSecretWord: vi.fn().mockResolvedValue({ success: true }),
  activateClue: vi.fn().mockResolvedValue({ success: true }),
  respondToRhyme: vi.fn().mockResolvedValue({ success: true }),
  guessWord: vi.fn().mockResolvedValue({ success: true }),
  submitTiebreakerWord: vi.fn().mockResolvedValue({ success: true }),
}));

const tiles = { vowels: ['A', 'E', 'I', 'O'], consonants: ['C', 'B', 'D', 'F', 'G', 'H', 'J'] };

let fakeState = {};
let fakeHand = {};
vi.mock('../hooks/useRoomState.js', () => ({ useRoomState: () => ({ state: fakeState, loading: false }) }));
vi.mock('../hooks/useWordyHand.js', () => ({ useWordyHand: () => ({ ...fakeHand, loading: false }) }));

const room = {
  id: 'room1',
  code: 'ABCD',
  hostUid: 'me',
  gameType: 'a-little-wordy',
  players: [
    { uid: 'me', displayName: 'Me', seat: 0 },
    { uid: 'opp', displayName: 'Opp', seat: 1 },
  ],
};

function renderTable() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <WordyTableContainer room={room} />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('WordyTableContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeState = {
      phase: 'wordSubmission',
      turnUid: null,
      turnOrder: ['me', 'opp'],
      tokens: { me: 0, opp: 0 },
      guessedCorrectly: { me: false, opp: false },
      availableClues: ['last-letter', 'letter-strike', 'exact-word-length'],
      pendingClue: null,
      winnerUid: null,
    };
    fakeHand = {
      originalTiles: tiles,
      tilesInFront: tiles,
      secretWord: null,
      tiebreakerWord: null,
    };
    fakeEntries = [];
    localStorage.clear();
  });

  it('word submission: renders own tiles and builds the word by clicking tiles in order', async () => {
    renderTable();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();

    // Click tiles in order to build "CAB" — the click fallback for the
    // drag-and-drop tile rack (see WordBuilder.jsx).
    await userEvent.click(screen.getByText('C'));
    await userEvent.click(screen.getByText('A'));
    await userEvent.click(screen.getByText('B'));
    await userEvent.click(screen.getByRole('button', { name: 'Lock it in' }));

    expect(submitSecretWord).toHaveBeenCalledWith({ roomId: 'room1', word: 'CAB' });
  });

  it('word submission: shows a waiting message with the locked word, no builder', () => {
    fakeHand.secretWord = 'CAB';
    renderTable();
    expect(screen.getByText(/waiting for Opp/i)).toBeInTheDocument();
    expect(screen.getByText(/locked in "CAB"/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lock it in' })).not.toBeInTheDocument();
  });

  it('clueOrGuess: a no-arg clue opens a review/confirm modal before activating', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.click(screen.getByText('Last Letter'));
    expect(activateClue).not.toHaveBeenCalled();
    expect(screen.getByText(/reveals the last letter/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(activateClue).toHaveBeenCalledWith({ roomId: 'room1', clueId: 'last-letter', args: {} });
  });

  it('clueOrGuess: Cancel in the clue confirm modal closes it without activating', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.click(screen.getByText('Last Letter'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(activateClue).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('clueOrGuess: an arg-needing clue opens a letter picker, then confirms with the chosen letter', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.click(screen.getByText('Letter Strike'));
    expect(screen.getByText(/choose a letter/i)).toBeInTheDocument();

    // Letter picker tiles use the same "A"/"C" text as the tile rack above —
    // grab one from inside the modal specifically.
    const modalLetterA = screen.getAllByText('A').at(-1);
    await userEvent.click(modalLetterA);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(activateClue).toHaveBeenCalledWith({ roomId: 'room1', clueId: 'letter-strike', args: { letter: 'A' } });
  });

  it('clueOrGuess: builds and submits a guess by clicking tiles', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.click(screen.getByText('D'));
    await userEvent.click(screen.getByText('O'));
    await userEvent.click(screen.getByText('G'));
    await userEvent.click(screen.getByRole('button', { name: 'Guess' }));

    expect(guessWord).toHaveBeenCalledWith({ roomId: 'room1', guess: 'DOG' });
  });

  it("clueOrGuess: shows a waiting message on the opponent's turn instead of actions", () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'opp' };
    renderTable();
    expect(screen.getByText(/waiting for opp/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guess' })).not.toBeInTheDocument();
  });

  it('Rhyme Time: the responder sees a response form instead of normal actions', async () => {
    fakeState = {
      ...fakeState,
      phase: 'clueOrGuess',
      turnUid: 'me',
      pendingClue: { clueId: 'rhyme-time', activatorUid: 'opp', responderUid: 'me' },
    };
    renderTable();

    expect(screen.getByPlaceholderText(/rhymes with your secret word/i)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/rhymes with your secret word/i), 'blab');
    await userEvent.click(screen.getByRole('button', { name: 'Respond' }));

    expect(respondToRhyme).toHaveBeenCalledWith({ roomId: 'room1', word: 'blab' });
  });

  it('tiebreaker: builds and submits a new word from original tiles by clicking tiles', async () => {
    fakeState = { ...fakeState, phase: 'tiebreaker', turnUid: null };
    renderTable();

    await userEvent.click(screen.getByText('F'));
    await userEvent.click(screen.getByText('A'));
    await userEvent.click(screen.getByText('D'));
    await userEvent.click(screen.getByText('E'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(submitTiebreakerWord).toHaveBeenCalledWith({ roomId: 'room1', word: 'FADE' });
  });

  it('completed: shows a win message and a Back to Dashboard button', () => {
    fakeState = { ...fakeState, phase: 'completed', winnerUid: 'me' };
    renderTable();
    expect(screen.getByText('You won!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });

  it('completed: shows the opponent as the winner when they won', () => {
    fakeState = { ...fakeState, phase: 'completed', winnerUid: 'opp' };
    renderTable();
    expect(screen.getByText('Opp won.')).toBeInTheDocument();
  });

  it('clueOrGuess: renders the Clues Record filtered to what I\'ve gathered, and toggles to what they know about my word', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'opp' };
    fakeHand.secretWord = 'CAB';
    fakeEntries = [
      { id: '1', kind: 'clue', clueId: 'last-letter', activatorUid: 'me', aboutUid: 'opp', message: 'I learned it ends in "B".' },
      { id: '2', kind: 'guess', guesserUid: 'opp', aboutUid: 'me', correct: false, guess: 'DOG', message: 'Opp guessed wrong.' },
    ];
    renderTable();

    expect(screen.getByText('Last Letter')).toBeInTheDocument();
    expect(screen.queryByText('"DOG"')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('My Word'));
    expect(screen.getByText('Your word: CAB')).toBeInTheDocument();
    expect(screen.getByText('"DOG"')).toBeInTheDocument();
  });

  describe('turn review overlay', () => {
    beforeEach(() => {
      fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
      fakeEntries = [
        { id: '1', seq: 0, message: 'Tiles dealt — build your Secret Word!' },
        { id: '2', seq: 1, message: 'Test announcement one.' },
        { id: '3', seq: 2, message: 'Test announcement two.' },
      ];
      localStorage.setItem('a-little-wordy:lastSeenLogSeq:room1', '0');
    });

    it('shows pending entries as announcements, Previous disabled first', async () => {
      renderTable();
      expect(await screen.findByText('TURN 1 OF 2')).toBeInTheDocument();
      expect(screen.getAllByText('Test announcement one.').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: '◀ Previous' })).toBeDisabled();
    });

    it('Next steps forward and Done closes the overlay, persisting lastSeenSeq', async () => {
      renderTable();
      await screen.findByText('TURN 1 OF 2');

      await userEvent.click(screen.getByRole('button', { name: 'Next ▶' }));
      expect(screen.getByText('TURN 2 OF 2')).toBeInTheDocument();
      // Also appears in the always-visible ActionLogPanel — just confirm it
      // rendered somewhere (see ActiveTableContainer.test.jsx for the same pattern).
      expect(screen.getAllByText('Test announcement two.').length).toBeGreaterThan(0);

      await userEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.queryByText(/TURN \d+ OF \d+/)).not.toBeInTheDocument();
      expect(localStorage.getItem('a-little-wordy:lastSeenLogSeq:room1')).toBe('2');
    });

    it('does not show a review overlay on a fresh join with no stored lastSeenSeq', () => {
      localStorage.clear();
      renderTable();
      expect(screen.queryByText(/TURN \d+ OF \d+/)).not.toBeInTheDocument();
    });
  });
});
