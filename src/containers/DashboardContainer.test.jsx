import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { DashboardContainer } from './DashboardContainer.jsx';
import { deleteRoom, joinRoomById } from '../utils/rooms.js';
import { dismissActivity } from '../utils/activity.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me', displayName: 'Me' } }) }));
vi.mock('../utils/rooms.js', () => ({
  joinRoomByCode: vi.fn(),
  joinRoomById: vi.fn().mockResolvedValue(undefined),
  deleteRoom: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../utils/activity.js', () => ({ dismissActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../utils/follows.js', () => ({ followUser: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../hooks/useFollowing.js', () => ({ useFollowing: () => ({ friends: [] }) }));
vi.mock('../hooks/useGameCatalog.js', () => ({
  useGameCatalog: () => ({ games: [{ id: 'love-letter', displayName: 'Love Letter' }], loading: false }),
}));

let fakeRooms = [];
let fakeActivity = [];
vi.mock('../hooks/useMyRooms.js', () => ({ useMyRooms: () => ({ rooms: fakeRooms, loading: false }) }));
vi.mock('../hooks/useActivity.js', () => ({ useActivity: () => ({ entries: fakeActivity, loading: false }) }));

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ThemeProvider theme={lightTheme}>
        <Routes>
          <Route path="/dashboard" element={<DashboardContainer />} />
          <Route path="/rooms/:roomId" element={<div>Room Page</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('DashboardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeActivity = [];
    fakeRooms = [
      {
        id: 'room-mine-waiting',
        code: 'AAAA',
        hostUid: 'me',
        status: 'waiting',
        players: [{ uid: 'me', displayName: 'Me' }],
      },
      {
        id: 'room-mine-active',
        code: 'BBBB',
        hostUid: 'me',
        status: 'active',
        players: [{ uid: 'me', displayName: 'Me' }],
      },
      {
        id: 'room-not-mine',
        code: 'CCCC',
        hostUid: 'opp',
        status: 'waiting',
        players: [
          { uid: 'opp', displayName: 'Opp' },
          { uid: 'me', displayName: 'Me' },
        ],
      },
    ];
  });

  it('shows a delete button only for rooms I host that are not active', () => {
    renderDashboard();
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete room' });
    expect(deleteButtons).toHaveLength(1);
  });

  it('clicking delete opens a confirmation modal without navigating', async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));

    expect(screen.getByText('Delete this room?')).toBeInTheDocument();
    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it('confirming calls deleteRoom with the room id and code, then closes the modal', async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteRoom).toHaveBeenCalledWith({ roomId: 'room-mine-waiting', code: 'AAAA' });
    await waitFor(() => expect(screen.queryByText('Delete this room?')).not.toBeInTheDocument());
  });

  it('Cancel closes the modal without deleting', async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete this room?')).not.toBeInTheDocument();
    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it('joining an invite from the activity feed joins the room, dismisses the entry, and navigates there', async () => {
    fakeActivity = [
      {
        id: 'act1',
        type: 'invite',
        roomId: 'room9',
        roomCode: 'ZZZZ',
        gameType: 'love-letter',
        inviterUid: 'alice',
        inviterName: 'Alice',
        createdAt: null,
      },
    ];
    renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: 'Join' }));

    expect(joinRoomById).toHaveBeenCalledWith({ roomId: 'room9', uid: 'me', displayName: 'Me' });
    expect(dismissActivity).toHaveBeenCalledWith({ uid: 'me', eventId: 'act1' });
    expect(await screen.findByText('Room Page')).toBeInTheDocument();
  });

  it('declining an invite dismisses the entry without joining', async () => {
    fakeActivity = [
      {
        id: 'act1',
        type: 'invite',
        roomId: 'room9',
        roomCode: 'ZZZZ',
        gameType: 'love-letter',
        inviterUid: 'alice',
        inviterName: 'Alice',
        createdAt: null,
      },
    ];
    renderDashboard();

    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(dismissActivity).toHaveBeenCalledWith({ uid: 'me', eventId: 'act1' });
    expect(joinRoomById).not.toHaveBeenCalled();
  });
});
