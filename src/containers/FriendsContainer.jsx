import { useState } from 'react';
import styled from 'styled-components';
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

const Header = styled.div`
  margin-bottom: 26px;
`;

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 42px;
  letter-spacing: -1px;
  margin-bottom: 6px;
`;

const Subtitle = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.inkFaint};
`;

const FollowForm = styled.form`
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 12px 18px;
  font-size: 14px;
  font-family: inherit;
  color: #2e2013;
  background: ${({ theme }) => theme.colors.surface};

  &::placeholder {
    color: rgba(46, 32, 19, 0.45);
  }
`;

const FollowHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkFainter};
  margin-bottom: 22px;
`;

const FollowError = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.terracotta};
  margin-bottom: 22px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 14px 18px;
`;

const Info = styled.div`
  flex: 1;
`;

const NameText = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #2e2013;
`;

const StatusText = styled.div`
  font-size: 12px;
  color: rgba(46, 32, 19, 0.5);
`;

const InviteButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: #2e2013;
  font-family: inherit;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

const ModalTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 22px;
  color: #2e2013;
  margin-bottom: 8px;
`;

const ModalText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: rgba(46, 32, 19, 0.75);
  margin-bottom: 22px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
`;

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
      <Header>
        <Title>Following</Title>
        <Subtitle>People you follow — see who's around for a game.</Subtitle>
      </Header>

      <FollowForm onSubmit={handleFollow}>
        <SearchInput
          placeholder="Paste a friend's user ID…"
          value={targetUid}
          onChange={(e) => setTargetUid(e.target.value)}
        />
        <Button type="submit" style={{ background: '#7C8C4A' }} disabled={following}>
          + Follow
        </Button>
      </FollowForm>
      {followError ? (
        <FollowError>{followError}</FollowError>
      ) : (
        <FollowHint>
          Username search is coming later — for now, share your Profile's user ID with friends.
        </FollowHint>
      )}

      {loading && <EmptyText>Loading friends…</EmptyText>}
      {!loading && friends.length === 0 && <EmptyText>Not following anyone yet.</EmptyText>}

      <List>
        {friends.map((friend) => {
          const online = Boolean(presence[friend.uid]);
          return (
            <Row key={friend.uid}>
              <Avatar
                size={42}
                color={colorForId(friend.uid)}
                imageUrl={friend.avatarUrl}
                showStatus
                online={online}
                statusRingColor="#F5ECD8"
              />
              <Info>
                <NameText>{friend.displayName}</NameText>
                <StatusText>{online ? 'Online' : 'Offline'}</StatusText>
              </Info>
              <InviteButton>Invite</InviteButton>
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
            </Row>
          );
        })}
      </List>

      {blockTarget && (
        <Modal onClose={() => !rowBusyUid && setBlockTarget(null)}>
          <ModalTitle>Block {blockTarget.displayName}?</ModalTitle>
          <ModalText>
            You'll stop following each other, and they won't be able to follow you or invite you to games again.
          </ModalText>
          <ModalActions>
            <Button onClick={handleConfirmBlock} disabled={Boolean(rowBusyUid)}>
              {rowBusyUid ? 'Blocking…' : 'Block'}
            </Button>
            <Button $variant="outline" onClick={() => setBlockTarget(null)} disabled={Boolean(rowBusyUid)}>
              Cancel
            </Button>
          </ModalActions>
        </Modal>
      )}
    </PageWrap>
  );
}
