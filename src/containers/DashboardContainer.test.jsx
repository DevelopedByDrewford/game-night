import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { DashboardContainer } from './DashboardContainer.jsx';
import { deleteRoom } from '../utils/rooms.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me', displayName: 'Me' } }) }));
vi.mock('../utils/rooms.js', () => ({
  joinRoomByCode: vi.fn(),
  deleteRoom: vi.fn().mockResolvedValue(undefined),
}));

let fakeRooms = [];
vi.mock('../hooks/useMyRooms.js', () => ({ useMyRooms: () => ({ rooms: fakeRooms, loading: false }) }));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <DashboardContainer />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('DashboardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
