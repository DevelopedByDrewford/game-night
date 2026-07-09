import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { lightTheme } from '../styles/theme.js';
import { ProfileContainer } from './ProfileContainer.jsx';
import { followUser } from '../utils/follows.js';

vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: () => ({ user: { uid: 'me', displayName: 'Me' } }) }));
vi.mock('../hooks/useGameCatalog.js', () => ({ useGameCatalog: () => ({ games: [], loading: false }) }));
vi.mock('../utils/profile.js', () => ({ updateProfile: vi.fn() }));
vi.mock('../utils/follows.js', () => ({ followUser: vi.fn().mockResolvedValue(undefined) }));

let fakeFriends = [];
vi.mock('../hooks/useFollowing.js', () => ({ useFollowing: () => ({ friends: fakeFriends }) }));

let fakeProfileByUid = {};
vi.mock('../hooks/useProfile.js', () => ({
  useProfile: (uid) => {
    const targetUid = uid || 'me';
    const isOwnProfile = targetUid === 'me';
    return {
      profile: fakeProfileByUid[targetUid] || null,
      loading: false,
      isOwnProfile,
    };
  },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={lightTheme}>
        <Routes>
          <Route path="/profile" element={<ProfileContainer />} />
          <Route path="/profile/:uid" element={<ProfileContainer />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('ProfileContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeFriends = [];
    fakeProfileByUid = {
      me: { displayName: 'Me', createdAt: null },
      alice: { displayName: 'Alice', createdAt: null },
    };
  });

  it('shows Edit Profile and the user ID row on your own profile', () => {
    renderAt('/profile');

    expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
    expect(screen.getByText(/Your user ID/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Follow/ })).not.toBeInTheDocument();
  });

  it("shows a Follow button (not Edit Profile) on another user's profile, no user ID row", () => {
    renderAt('/profile/alice');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Profile' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Your user ID/)).not.toBeInTheDocument();
  });

  it('clicking Follow calls followUser with the viewed profile\'s uid', async () => {
    renderAt('/profile/alice');

    await userEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(followUser).toHaveBeenCalledWith({ uid: 'me', targetUid: 'alice' });
  });

  it('shows a disabled Following button when already following', () => {
    fakeFriends = [{ uid: 'alice', displayName: 'Alice' }];
    renderAt('/profile/alice');

    const button = screen.getByRole('button', { name: 'Following' });
    expect(button).toBeDisabled();
  });

  it("shows a not-found message when the profile doesn't exist", () => {
    renderAt('/profile/nobody');
    expect(screen.getByText(/couldn't be found/)).toBeInTheDocument();
  });
});
