import { describe, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { writeFileSync } from 'node:fs';
import { SideEffectsTableContainer } from './SideEffectsTableContainer.jsx';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }));
vi.mock('../hooks/useRoomPresenceMap.js', () => ({ useRoomPresenceMap: () => ({ opp: true }) }));
vi.mock('../hooks/useRoomLog.js', () => ({ useRoomLog: () => ({ entries: [], loading: false }) }));
vi.mock('../utils/rooms.js', () => ({ endGameEarly: vi.fn() }));
vi.mock('../utils/sideEffectsGameplay.js', () => ({
  playAction: vi.fn().mockResolvedValue({ success: true }),
  endTurn: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../utils/sideEffectsCardArt.js', () => ({ frontImageFor: () => undefined, backImageFor: () => undefined }));

const fakeState = {
  ruleset: 'base',
  turnOrder: ['me', 'opp'],
  turnUid: 'me',
  turnNumber: 1,
  movesThisTurn: 0,
  deckCount: 40,
  discardCount: 0,
  psyches: {
    me: [
      { disorderId: 'anxiety', drugId: 'anxietyTreatment', episodeActive: null },
      { disorderId: 'anorexia', drugId: null, episodeActive: null },
      { disorderId: 'depression', drugId: null, episodeActive: 'depression' },
      { disorderId: 'gamblingAddiction', drugId: null, episodeActive: null },
      { disorderId: 'impotence', drugId: null, episodeActive: null },
      { disorderId: 'madness', drugId: null, episodeActive: null },
      { disorderId: 'suicidalThoughts', drugId: null, episodeActive: null },
      { disorderId: 'tremors', drugId: null, episodeActive: null },
    ],
    opp: [{ disorderId: 'impotence', drugId: null, episodeActive: null }],
  },
  restrictions: { me: { depression: true }, opp: {} },
  phase: 'playing',
  winnerUid: null,
};
const fakeHand = ['anxietyTreatment'];

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

const SCRATCH = '/private/tmp/claude-501/-Users-andrewcook-Documents-Dev-Personal-games/a668d22d-7f66-4ac6-9d02-8d6ff1849d42/scratchpad';

describe('manual preview', () => {
  it('dumps 8-card psyche carousel on desktop (page 1)', async () => {
    window.innerWidth = 1200;
    const { container } = render(
      <MemoryRouter>
        <SideEffectsTableContainer room={room} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByText('Anxiety')[0]);
    writeFileSync(`${SCRATCH}/se-paged-desktop-p1.html`, container.innerHTML);

    await userEvent.click(screen.getByRole('button', { name: 'Next cards' }));
    writeFileSync(`${SCRATCH}/se-paged-desktop-p2.html`, container.innerHTML);
  });

  it('dumps 8-card psyche carousel on a smaller desktop width (fewer per page)', async () => {
    window.innerWidth = 900;
    const { container } = render(
      <MemoryRouter>
        <SideEffectsTableContainer room={room} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByText('Anxiety')[0]);
    writeFileSync(`${SCRATCH}/se-paged-desktop-900.html`, container.innerHTML);
  });
});
