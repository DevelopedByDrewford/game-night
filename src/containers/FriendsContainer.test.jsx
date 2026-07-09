import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { FriendsContainer } from './FriendsContainer.jsx';
import { unfollowUser, blockUser } from '../utils/follows.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me', displayName: 'Me' } }) }));
vi.mock('../hooks/usePresenceMap.js', () => ({ usePresenceMap: () => ({}) }));
vi.mock('../utils/follows.js', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn().mockResolvedValue(undefined),
  blockUser: vi.fn().mockResolvedValue(undefined),
}));

let fakeFriends = [];
vi.mock('../hooks/useFollowing.js', () => ({ useFollowing: () => ({ friends: fakeFriends, loading: false }) }));

function renderFriends() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <FriendsContainer />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('FriendsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeFriends = [{ uid: 'alice', displayName: 'Alice' }];
  });

  it('opens the overflow menu with Unfollow and Block options', async () => {
    renderFriends();
    await userEvent.click(screen.getByRole('button', { name: 'More options for Alice' }));

    expect(screen.getByRole('menuitem', { name: 'Unfollow' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Block' })).toBeInTheDocument();
  });

  it('Unfollow calls unfollowUser with the friend uid', async () => {
    renderFriends();
    await userEvent.click(screen.getByRole('button', { name: 'More options for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unfollow' }));

    expect(unfollowUser).toHaveBeenCalledWith({ uid: 'me', targetUid: 'alice' });
  });

  it('Block opens a confirmation modal without blocking yet', async () => {
    renderFriends();
    await userEvent.click(screen.getByRole('button', { name: 'More options for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Block' }));

    expect(screen.getByText('Block Alice?')).toBeInTheDocument();
    expect(blockUser).not.toHaveBeenCalled();
  });

  it('confirming the block modal calls blockUser and closes the modal', async () => {
    renderFriends();
    await userEvent.click(screen.getByRole('button', { name: 'More options for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Block' }));
    await userEvent.click(screen.getByRole('button', { name: 'Block' }));

    expect(blockUser).toHaveBeenCalledWith({ uid: 'me', targetUid: 'alice' });
    await waitFor(() => expect(screen.queryByText('Block Alice?')).not.toBeInTheDocument());
  });

  it('Cancel closes the block modal without blocking', async () => {
    renderFriends();
    await userEvent.click(screen.getByRole('button', { name: 'More options for Alice' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Block' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Block Alice?')).not.toBeInTheDocument();
    expect(blockUser).not.toHaveBeenCalled();
  });
});
