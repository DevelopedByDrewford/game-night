import { useState } from 'react';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { OverflowMenu } from '../components/ui/OverflowMenu.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFollowing } from '../hooks/useFollowing.js';
import { usePresenceMap } from '../hooks/usePresenceMap.js';
import { followUser, unfollowUser, blockUser } from '../utils/follows.js';
import { colorForId } from '../utils/colors.js';
import './FriendsContainer.css';

export function FriendsContainer() {
  const { user } = useAuth();
  const { friends, loading } = useFollowing();
  const presence = usePresenceMap(friends.map((f) => f.uid));
  const [targetUid, setTargetUid] = useState('');
  const [followError, setFollowError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [rowBusyUid, setRowBusyUid] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null); // friend object pending block confirmation

  async function handleFollow(e) {
    e.preventDefault();
    if (!targetUid.trim()) return;
    setFollowing(true);
    setFollowError(null);
    try {
      await followUser({ uid: user.uid, targetUid: targetUid.trim() });
      setTargetUid('');
    } catch (err) {
      const messages = {
        CANNOT_FOLLOW_SELF: "You can't follow yourself.",
        USER_NOT_FOUND: 'No player found with that ID.',
      };
      setFollowError(messages[err.message] || "Couldn't follow that player.");
    } finally {
      setFollowing(false);
    }
  }

  async function handleUnfollow(friendUid) {
    setRowBusyUid(friendUid);
    try {
      await unfollowUser({ uid: user.uid, targetUid: friendUid });
    } catch (err) {
      console.error('[FriendsContainer] failed to unfollow', err);
    } finally {
      setRowBusyUid(null);
    }
  }

  async function handleConfirmBlock() {
    if (!blockTarget) return;
    setRowBusyUid(blockTarget.uid);
    try {
      await blockUser({ uid: user.uid, targetUid: blockTarget.uid });
      setBlockTarget(null);
    } catch (err) {
      console.error('[FriendsContainer] failed to block', err);
    } finally {
      setRowBusyUid(null);
    }
  }

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <div className="friends-header">
        <div className="friends-title">Following</div>
        <div className="friends-subtitle">People you follow — see who's around for a game.</div>
      </div>

      <form className="friends-follow-form" onSubmit={handleFollow}>
        <input
          className="friends-search-input"
          placeholder="Paste a friend's user ID…"
          value={targetUid}
          onChange={(e) => setTargetUid(e.target.value)}
        />
        <Button type="submit" style={{ background: '#7C8C4A' }} disabled={following}>
          + Follow
        </Button>
      </form>
      {followError ? (
        <div className="friends-follow-error">{followError}</div>
      ) : (
        <div className="friends-follow-hint">
          Username search is coming later — for now, share your Profile's user ID with friends.
        </div>
      )}

      {loading && <div className="friends-empty-text">Loading friends…</div>}
      {!loading && friends.length === 0 && <div className="friends-empty-text">Not following anyone yet.</div>}

      <div className="friends-list">
        {friends.map((friend) => {
          const online = Boolean(presence[friend.uid]);
          return (
            <div className="friends-row" key={friend.uid}>
              <Avatar
                size={42}
                color={colorForId(friend.uid)}
                imageUrl={friend.avatarUrl}
                showStatus
                online={online}
                statusRingColor="#F5ECD8"
              />
              <div className="friends-row__info">
                <div className="friends-row__name">{friend.displayName}</div>
                <div className="friends-row__status">{online ? 'Online' : 'Offline'}</div>
              </div>
              <button className="friends-invite-button">Invite</button>
              <OverflowMenu
                ariaLabel={`More options for ${friend.displayName}`}
                items={[
                  {
                    label: 'Unfollow',
                    disabled: rowBusyUid === friend.uid,
                    onClick: () => handleUnfollow(friend.uid),
                  },
                  {
                    label: 'Block',
                    danger: true,
                    disabled: rowBusyUid === friend.uid,
                    onClick: () => setBlockTarget(friend),
                  },
                ]}
              />
            </div>
          );
        })}
      </div>

      {blockTarget && (
        <Modal onClose={() => !rowBusyUid && setBlockTarget(null)}>
          <div className="friends-modal-title">Block {blockTarget.displayName}?</div>
          <div className="friends-modal-text">
            You'll stop following each other, and they won't be able to follow you or invite you to games again.
          </div>
          <div className="friends-modal-actions">
            <Button onClick={handleConfirmBlock} disabled={Boolean(rowBusyUid)}>
              {rowBusyUid ? 'Blocking…' : 'Block'}
            </Button>
            <Button $variant="outline" onClick={() => setBlockTarget(null)} disabled={Boolean(rowBusyUid)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </PageWrap>
  );
}
