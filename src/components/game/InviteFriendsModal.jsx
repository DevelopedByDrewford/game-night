import { Modal } from '../ui/Modal.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { colorForId } from '../../utils/colors.js';
import './InviteFriendsModal.css';

function FriendRowItem({ friend, invited, busy, onInvite }) {
  return (
    <div className="invite-friends-modal__friend-row">
      <Avatar size={40} color={colorForId(friend.uid)} imageUrl={friend.avatarUrl} />
      <div className="invite-friends-modal__friend-name">{friend.displayName}</div>
      <Button $variant="outline" disabled={invited || busy} onClick={() => onInvite(friend.uid)}>
        {invited ? 'Invited' : 'Invite'}
      </Button>
    </div>
  );
}

// friends = everyone the current user follows, minus anyone already in the
// room (filtered by the caller — see LobbyContainer/CreateRoomContainer).
// "shouldn't see them if we are blocked by them" is inherited for free: a
// block severs the follow relationship in both directions server-side
// (functions/lib/social.js#onBlocked), so a friend who has blocked us never
// appears in useFollowing() to begin with — no extra filtering needed here.
export function InviteFriendsModal({ friends, presence, invitedUids, busyUid, onInvite, onClose }) {
  const online = friends.filter((f) => presence[f.uid]);
  const offline = friends.filter((f) => !presence[f.uid]);

  return (
    <Modal onClose={onClose} wide>
      <div className="invite-friends-modal__title">Invite Friends</div>
      <div className="invite-friends-modal__subtitle">They'll get a notification and a request on their Dashboard.</div>

      <div className="invite-friends-modal__scroll-area">
        {friends.length === 0 && (
          <div className="invite-friends-modal__empty">
            You're not following anyone yet — follow friends from the Friends page first.
          </div>
        )}

        {online.length > 0 && (
          <>
            <div className="invite-friends-modal__section-label">Online</div>
            {online.map((friend) => (
              <FriendRowItem
                key={friend.uid}
                friend={friend}
                invited={invitedUids.has(friend.uid)}
                busy={busyUid === friend.uid}
                onInvite={onInvite}
              />
            ))}
          </>
        )}

        {offline.length > 0 && (
          <>
            <div className="invite-friends-modal__section-label">Offline</div>
            {offline.map((friend) => (
              <FriendRowItem
                key={friend.uid}
                friend={friend}
                invited={invitedUids.has(friend.uid)}
                busy={busyUid === friend.uid}
                onInvite={onInvite}
              />
            ))}
          </>
        )}
      </div>

      <div className="invite-friends-modal__close-row">
        <Button $variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
