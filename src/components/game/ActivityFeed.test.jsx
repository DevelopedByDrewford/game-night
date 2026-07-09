import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { lightTheme } from '../../styles/theme.js';
import { ActivityFeed } from './ActivityFeed.jsx';

function renderFeed(props) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <ActivityFeed
          entries={[]}
          loading={false}
          gameNames={{ 'love-letter': 'Love Letter' }}
          followingUids={new Set()}
          followBackBusyUid={null}
          onFollowBack={vi.fn()}
          {...props}
        />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('ActivityFeed', () => {
  it('shows an empty state when there are no entries', () => {
    renderFeed({});
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
  });

  it('renders a follow entry with a profile link and a Follow Back button', () => {
    renderFeed({
      entries: [{ id: '1', type: 'follow', actorUid: 'alice', actorName: 'Alice', createdAt: null }],
    });

    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', '/profile/alice');
    expect(screen.getByRole('button', { name: 'Follow Back' })).toBeInTheDocument();
  });

  it('shows a disabled "Following" button when already following the actor', () => {
    renderFeed({
      entries: [{ id: '1', type: 'follow', actorUid: 'alice', actorName: 'Alice', createdAt: null }],
      followingUids: new Set(['alice']),
    });

    const button = screen.getByRole('button', { name: 'Following' });
    expect(button).toBeDisabled();
  });

  it('calls onFollowBack with the actor uid when clicked', async () => {
    const onFollowBack = vi.fn();
    renderFeed({
      entries: [{ id: '1', type: 'follow', actorUid: 'alice', actorName: 'Alice', createdAt: null }],
      onFollowBack,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Follow Back' }));
    expect(onFollowBack).toHaveBeenCalledWith('alice');
  });

  it('renders game_won and game_lost entries with the resolved game name and room code', () => {
    renderFeed({
      entries: [
        { id: '1', type: 'game_won', gameType: 'love-letter', roomCode: 'ABCD', createdAt: null },
        { id: '2', type: 'game_lost', gameType: 'love-letter', roomCode: 'WXYZ', createdAt: null },
      ],
    });

    expect(screen.getByText(/You won Love Letter in Room ABCD/)).toBeInTheDocument();
    expect(screen.getByText(/You lost Love Letter in Room WXYZ/)).toBeInTheDocument();
  });
});
