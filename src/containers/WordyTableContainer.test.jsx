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
vi.mock('../hooks/useRoomLog.js', () => ({ useRoomLog: () => ({ entries: [], loading: false }) }));
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
  });

  it('word submission: renders own tiles and submits the typed word', async () => {
    renderTable();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/type a word/i), 'cab');
    await userEvent.click(screen.getByRole('button', { name: 'Lock it in' }));

    expect(submitSecretWord).toHaveBeenCalledWith({ roomId: 'room1', word: 'cab' });
  });

  it('word submission: shows a waiting message once locked in, no form', () => {
    fakeHand.secretWord = 'CAB';
    renderTable();
    expect(screen.getByText(/waiting for Opp/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type a word/i)).not.toBeInTheDocument();
  });

  it('clueOrGuess: activates a no-arg clue immediately on click', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.click(screen.getByText('Last Letter'));
    expect(activateClue).toHaveBeenCalledWith({ roomId: 'room1', clueId: 'last-letter' });
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

  it('clueOrGuess: submits a guess', async () => {
    fakeState = { ...fakeState, phase: 'clueOrGuess', turnUid: 'me' };
    renderTable();

    await userEvent.type(screen.getByPlaceholderText(/guess their secret word/i), 'dog');
    await userEvent.click(screen.getByRole('button', { name: 'Guess' }));

    expect(guessWord).toHaveBeenCalledWith({ roomId: 'room1', guess: 'dog' });
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

  it('tiebreaker: submits a new word from original tiles', async () => {
    fakeState = { ...fakeState, phase: 'tiebreaker', turnUid: null };
    renderTable();

    await userEvent.type(screen.getByPlaceholderText(/4-letter word/i), 'fade');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(submitTiebreakerWord).toHaveBeenCalledWith({ roomId: 'room1', word: 'fade' });
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
});
