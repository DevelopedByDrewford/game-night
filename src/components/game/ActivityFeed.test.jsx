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
          respondBusyId={null}
          onJoinInvite={vi.fn()}
          onDeclineInvite={vi.fn()}
          joinedRoomIds={new Set()}
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

  it('renders an invite entry with a profile link and Join/Decline buttons', async () => {
    const onJoinInvite = vi.fn();
    const onDeclineInvite = vi.fn();
    const entry = {
      id: '1',
      type: 'invite',
      roomId: 'room1',
      roomCode: 'ABCD',
      gameType: 'love-letter',
      inviterUid: 'alice',
      inviterName: 'Alice',
      createdAt: null,
    };
    renderFeed({ entries: [entry], onJoinInvite, onDeclineInvite });

    expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute('href', '/profile/alice');
    expect(screen.getByText(/invited you to Love Letter — Room ABCD/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoinInvite).toHaveBeenCalledWith(entry);

    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDeclineInvite).toHaveBeenCalledWith(entry);
  });

  it('disables Join/Decline while responding to that specific invite', () => {
    renderFeed({
      entries: [
        { id: '1', type: 'invite', roomId: 'r1', roomCode: 'AAAA', gameType: 'love-letter', inviterUid: 'alice', inviterName: 'Alice', createdAt: null },
      ],
      respondBusyId: '1',
    });

    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });

  it('shows a disabled "Joined Game" button instead of Join/Decline once the invitee is already in that room', () => {
    renderFeed({
      entries: [
        { id: '1', type: 'invite', roomId: 'room1', roomCode: 'AAAA', gameType: 'love-letter', inviterUid: 'alice', inviterName: 'Alice', createdAt: null },
      ],
      joinedRoomIds: new Set(['room1']),
    });

    expect(screen.getByRole('button', { name: 'Joined Game' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('renders a player_joined entry with links to the player and the room', () => {
    renderFeed({
      entries: [
        {
          id: '1',
          type: 'player_joined',
          playerUid: 'bob',
          playerName: 'Bob',
          gameType: 'love-letter',
          roomId: 'room1',
          roomCode: 'ABCD',
          createdAt: null,
        },
      ],
    });

    expect(screen.getByRole('link', { name: 'Bob' })).toHaveAttribute('href', '/profile/bob');
    expect(screen.getByRole('link', { name: 'Room ABCD' })).toHaveAttribute('href', '/rooms/room1');
    expect(screen.getByText(/joined your Love Letter/)).toBeInTheDocument();
  });

  it('renders a game_started entry linking to the room', () => {
    renderFeed({
      entries: [
        { id: '1', type: 'game_started', gameType: 'love-letter', roomId: 'room1', roomCode: 'ABCD', createdAt: null },
      ],
    });

    expect(screen.getByText(/Love Letter is starting/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Room ABCD' })).toHaveAttribute('href', '/rooms/room1');
  });
});
