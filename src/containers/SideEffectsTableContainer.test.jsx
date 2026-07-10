import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SideEffectsTableContainer } from './SideEffectsTableContainer.jsx';
import { playAction, endTurn } from '../utils/sideEffectsGameplay.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }));
vi.mock('../hooks/useRoomPresenceMap.js', () => ({ useRoomPresenceMap: () => ({ opp: true }) }));
let fakeEntries = [];
vi.mock('../hooks/useRoomLog.js', () => ({ useRoomLog: () => ({ entries: fakeEntries, loading: false }) }));
vi.mock('../utils/rooms.js', () => ({ endGameEarly: vi.fn() }));
vi.mock('../utils/sideEffectsGameplay.js', () => ({
  playAction: vi.fn().mockResolvedValue({ success: true }),
  endTurn: vi.fn().mockResolvedValue({ success: true }),
}));
// No real card art in the test environment — keep PlayingCard on its
// text-label fallback so these interaction assertions (getByText('Anxiety'),
// etc.) stay meaningful regardless of what art exists on disk.
vi.mock('../utils/sideEffectsCardArt.js', () => ({ frontImageFor: () => undefined, backImageFor: () => undefined }));

let fakeState = {};
let fakeHand = [];
vi.mock('../hooks/useRoomState.js', () => ({ useRoomState: () => ({ state: fakeState, loading: false }) }));
vi.mock('../hooks/useHand.js', () => ({ useHand: () => ({ hand: fakeHand, loading: false }) }));

const room = {
  id: 'room1',
  code: 'ABCD',
  hostUid: 'me',
  gameType: 'side-effects',
  players: [
    { uid: 'me', displayName: 'Me', seat: 0 },
    { uid: 'opp', displayName: 'Opp', seat: 1 },
  ],
};

function renderTable() {
  return render(
    <MemoryRouter>
      <SideEffectsTableContainer room={room} />
    </MemoryRouter>
  );
}

describe('SideEffectsTableContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeState = {
      ruleset: 'base',
      turnOrder: ['me', 'opp'],
      turnUid: 'me',
      turnNumber: 1,
      movesThisTurn: 0,
      deckCount: 50,
      discardCount: 0,
      psyches: {
        me: [{ disorderId: 'anxiety', drugId: null, episodeActive: null }],
        opp: [{ disorderId: 'madness', drugId: 'madnessTreatment', episodeActive: null }],
      },
      restrictions: { me: {}, opp: {} },
      phase: 'playing',
      winnerUid: null,
    };
    fakeHand = ['anxietyTreatment'];
    fakeEntries = [];
    localStorage.clear();
  });

  it('renders every player\'s Psyche board and the current turn indicator', () => {
    renderTable();
    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Madness')).toBeInTheDocument();
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  it('shows the treated badge for an opponent\'s covered disorder', () => {
    renderTable();
    expect(screen.getByText(/madness treatment/i)).toBeInTheDocument();
  });

  it('treat: clicking a matching drug in hand and confirming plays it', async () => {
    renderTable();

    await userEvent.click(screen.getByText('Anxiety Treatment'));
    expect(screen.getByText(/treats: anxiety/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /treat anxiety/i }));

    expect(playAction).toHaveBeenCalledWith({
      roomId: 'room1',
      actionType: 'treat',
      cardId: 'anxietyTreatment',
    });
  });

  it('give a disorder: lists only vulnerable targets and plays the chosen one', async () => {
    fakeHand = ['gamblingAddiction'];
    // tremorsTreatment's side-effect list includes gamblingAddiction, so opp is vulnerable to it.
    fakeState.psyches.opp = [{ disorderId: 'tremors', drugId: 'tremorsTreatment', episodeActive: null }];
    renderTable();

    await userEvent.click(screen.getByText('Gambling Addiction'));
    expect(screen.getByText(/give gambling addiction/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Opp' }));

    expect(playAction).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room1', actionType: 'giveDisorder', cardId: 'gamblingAddiction', targetUid: 'opp' })
    );
  });

  it('therapy: lists own psyche disorders (excluding tremors) to discard', async () => {
    fakeHand = ['therapy'];
    fakeState.psyches.me = [
      { disorderId: 'anxiety', drugId: null, episodeActive: null },
      { disorderId: 'tremors', drugId: null, episodeActive: null },
    ];
    renderTable();

    await userEvent.click(screen.getByText('Therapy'));
    expect(screen.getByRole('button', { name: /discard anxiety/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /discard tremors/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /discard anxiety/i }));
    expect(playAction).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room1', actionType: 'therapy', cardId: 'therapy', ownDisorderId: 'anxiety' })
    );
  });

  it('episode: two-step target-then-disorder picker', async () => {
    fakeHand = ['episode'];
    fakeState.psyches.opp = [{ disorderId: 'madness', drugId: null, episodeActive: null }];
    renderTable();

    await userEvent.click(screen.getByText('Episode'));
    await userEvent.click(screen.getByRole('button', { name: 'Opp' }));
    expect(screen.getByRole('button', { name: 'Madness' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Madness' }));

    expect(playAction).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 'room1',
        actionType: 'episode',
        cardId: 'episode',
        targetUid: 'opp',
        targetDisorderId: 'madness',
      })
    );
  });

  it('End Turn calls endTurn with no discards when hand is at or under the cap', async () => {
    fakeHand = ['anxietyTreatment'];
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(endTurn).toHaveBeenCalledWith({ roomId: 'room1', discardCardIds: [] });
  });

  it('End Turn over the hand cap opens a discard picker instead of ending immediately', async () => {
    fakeHand = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(endTurn).not.toHaveBeenCalled();
    expect(screen.getByText(/choose 1 card/i)).toBeInTheDocument();
  });

  it("shows a waiting indicator and no End Turn button on the opponent's turn", () => {
    fakeState.turnUid = 'opp';
    renderTable();
    expect(screen.getByText(/opp's turn/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End Turn' })).not.toBeInTheDocument();
  });

  it('renders a winner banner once the game has ended', () => {
    fakeState.phase = 'gameEnd';
    fakeState.winnerUid = 'me';
    renderTable();
    expect(screen.getByText(/you won/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });
});
