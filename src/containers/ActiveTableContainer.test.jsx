import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { ActiveTableContainer } from './ActiveTableContainer.jsx';
import { playCard } from '../utils/gameplay.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }));
vi.mock('../hooks/useRoomPresenceMap.js', () => ({ useRoomPresenceMap: () => ({ opp: true }) }));
vi.mock('../hooks/useRoomLog.js', () => ({
  useRoomLog: () => ({ entries: [{ id: '1', message: 'Round 1 dealt.' }], loading: false }),
}));
vi.mock('../utils/rooms.js', () => ({ endGameEarly: vi.fn() }));
vi.mock('../utils/gameplay.js', () => ({ playCard: vi.fn().mockResolvedValue({ success: true, peekedCard: null }) }));
// No real card art in the test environment — keep PlayingCard on its
// text-label fallback so these interaction assertions (getByText('Guard'),
// etc.) stay meaningful regardless of what art exists on disk.
vi.mock('../utils/cardArt.js', () => ({ frontImageFor: () => undefined, backImageFor: () => undefined }));

const fakeState = {
  turnOrder: ['me', 'opp'],
  turnUid: 'me',
  roundNumber: 1,
  turnNumber: 1,
  deckCount: 9,
  setAsideVisible: [],
  discardPiles: { me: [], opp: [] },
  protected: { me: false, opp: false },
  eliminated: { me: false, opp: false },
  tokens: { me: 0, opp: 0 },
  tokensToWin: 7,
  phase: 'playing',
  logSeq: 1,
};

let fakeHand = ['guard', 'handmaid'];
vi.mock('../hooks/useRoomState.js', () => ({ useRoomState: () => ({ state: fakeState, loading: false }) }));
vi.mock('../hooks/useHand.js', () => ({ useHand: () => ({ hand: fakeHand, loading: false }) }));

const room = {
  id: 'room1',
  code: 'ABCD',
  hostUid: 'me',
  players: [
    { uid: 'me', displayName: 'Me', seat: 0 },
    { uid: 'opp', displayName: 'Opp', seat: 1 },
  ],
};

function renderTable() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <ActiveTableContainer room={room} />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('ActiveTableContainer', () => {
  beforeEach(() => {
    fakeHand = ['guard', 'handmaid'];
    vi.clearAllMocks();
  });

  it('renders opponents, hand, and turn indicator from live data', () => {
    renderTable();
    expect(screen.getByText('Opp')).toBeInTheDocument();
    expect(screen.getByText('Guard')).toBeInTheDocument();
    expect(screen.getByText('Handmaid')).toBeInTheDocument();
    expect(screen.getByText('▶ Your turn')).toBeInTheDocument();
  });

  it('plays an untargeted card (Handmaid) immediately, no picker shown', async () => {
    renderTable();
    await userEvent.click(screen.getByText('Handmaid'));
    expect(playCard).toHaveBeenCalledWith({
      roomId: 'room1',
      cardId: 'handmaid',
      targetUid: null,
      guessCardId: null,
    });
  });

  it('walks Guard through target + guess pickers before submitting', async () => {
    renderTable();
    await userEvent.click(screen.getByText('Guard'));

    expect(screen.getByText('Choose a target for Guard')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Opp' }));

    expect(screen.getByText("Guess Opp's card")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Priest' }));

    expect(playCard).toHaveBeenCalledWith({
      roomId: 'room1',
      cardId: 'guard',
      targetUid: 'opp',
      guessCardId: 'priest',
    });
  });
});
