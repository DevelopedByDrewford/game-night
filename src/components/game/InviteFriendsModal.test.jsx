import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { vi, describe, it, expect } from 'vitest';
import { lightTheme } from '../../styles/theme.js';
import { InviteFriendsModal } from './InviteFriendsModal.jsx';

function renderModal(props) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <InviteFriendsModal
        friends={[]}
        presence={{}}
        invitedUids={new Set()}
        busyUid={null}
        onInvite={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('InviteFriendsModal', () => {
  it('shows an empty state when following no one', () => {
    renderModal({});
    expect(screen.getByText(/not following anyone yet/)).toBeInTheDocument();
  });

  it('groups friends under Online and Offline headers, online first', () => {
    renderModal({
      friends: [
        { uid: 'bob', displayName: 'Bob' },
        { uid: 'alice', displayName: 'Alice' },
      ],
      presence: { alice: true, bob: false },
    });

    const headers = screen.getAllByText(/Online|Offline/);
    expect(headers.map((h) => h.textContent)).toEqual(['Online', 'Offline']);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('omits a section header when nobody falls into it', () => {
    renderModal({
      friends: [{ uid: 'alice', displayName: 'Alice' }],
      presence: { alice: true },
    });

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('calls onInvite with the friend uid when Invite is clicked', async () => {
    const onInvite = vi.fn();
    renderModal({ friends: [{ uid: 'alice', displayName: 'Alice' }], onInvite });

    await userEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(onInvite).toHaveBeenCalledWith('alice');
  });

  it('shows a disabled "Invited" button for a friend already invited this session', () => {
    renderModal({
      friends: [{ uid: 'alice', displayName: 'Alice' }],
      invitedUids: new Set(['alice']),
    });

    expect(screen.getByRole('button', { name: 'Invited' })).toBeDisabled();
  });

  it("disables only the busy friend's button while an invite is in flight", () => {
    renderModal({
      friends: [
        { uid: 'alice', displayName: 'Alice' },
        { uid: 'bob', displayName: 'Bob' },
      ],
      busyUid: 'alice',
    });

    const aliceRow = screen.getByText('Alice').parentElement;
    const bobRow = screen.getByText('Bob').parentElement;
    expect(within(aliceRow).getByRole('button', { name: 'Invite' })).toBeDisabled();
    expect(within(bobRow).getByRole('button', { name: 'Invite' })).not.toBeDisabled();
  });

  it('calls onClose when the Close button is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
