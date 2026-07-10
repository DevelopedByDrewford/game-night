import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { colorForId } from '../../utils/colors.js';
import { formatAbsoluteTime } from '../../utils/time.js';
import { roomLabel } from '../../utils/roomLabel.js';
import './ActivityFeed.css';

function describeGameResult(entry, gameNames) {
  const gameName = gameNames[entry.gameType] || 'a game';
  const label = roomLabel({ name: entry.roomName, code: entry.roomCode });
  return entry.type === 'game_won' ? `You won ${gameName} in ${label}! 🎉` : `You lost ${gameName} in ${label}.`;
}

export function ActivityFeed({
  entries,
  loading,
  gameNames,
  followingUids,
  followBackBusyUid,
  onFollowBack,
  respondBusyId,
  onJoinInvite,
  onDeclineInvite,
  joinedRoomIds,
}) {
  return (
    <div className="activity-feed">
      <div className="activity-feed__title">Activity</div>

      {loading && <div className="activity-feed__empty">Loading activity…</div>}
      {!loading && entries.length === 0 && (
        <div className="activity-feed__empty">Nothing yet — invites, new followers, and game updates will show up here.</div>
      )}

      <div className="activity-feed__list">
        {entries.map((entry) => {
          if (entry.type === 'follow') {
            const alreadyFollowing = followingUids.has(entry.actorUid);
            return (
              <div className="activity-feed__row" key={entry.id}>
                <Avatar size={40} color={colorForId(entry.actorUid)} />
                <div className="activity-feed__info">
                  <Link className="activity-feed__link" to={`/profile/${entry.actorUid}`}>
                    {entry.actorName}
                  </Link>{' '}
                  followed you.
                  <div className="activity-feed__time">{formatAbsoluteTime(entry.createdAt)}</div>
                </div>
                <Button
                  $variant="outline"
                  disabled={alreadyFollowing || followBackBusyUid === entry.actorUid}
                  onClick={() => onFollowBack(entry.actorUid)}
                >
                  {alreadyFollowing ? 'Following' : 'Follow Back'}
                </Button>
              </div>
            );
          }

          if (entry.type === 'invite') {
            const gameName = gameNames[entry.gameType] || 'a game';
            const busy = respondBusyId === entry.id;
            const alreadyJoined = joinedRoomIds?.has(entry.roomId);
            return (
              <div className="activity-feed__row" key={entry.id}>
                <Avatar size={40} color={colorForId(entry.inviterUid)} />
                <div className="activity-feed__info">
                  <Link className="activity-feed__link" to={`/profile/${entry.inviterUid}`}>
                    {entry.inviterName}
                  </Link>{' '}
                  invited you to {gameName} — {roomLabel({ name: entry.roomName, code: entry.roomCode })}.
                  <div className="activity-feed__time">{formatAbsoluteTime(entry.createdAt)}</div>
                </div>
                {alreadyJoined ? (
                  <Button $variant="outline" disabled>
                    Joined Game
                  </Button>
                ) : (
                  <div className="activity-feed__button-group">
                    <Button disabled={busy} onClick={() => onJoinInvite(entry)}>
                      Join
                    </Button>
                    <Button $variant="outline" disabled={busy} onClick={() => onDeclineInvite(entry)}>
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          if (entry.type === 'player_joined') {
            const gameName = gameNames[entry.gameType] || 'a game';
            return (
              <div className="activity-feed__row" key={entry.id}>
                <Avatar size={40} color={colorForId(entry.playerUid)} />
                <div className="activity-feed__info">
                  <Link className="activity-feed__link" to={`/profile/${entry.playerUid}`}>
                    {entry.playerName}
                  </Link>{' '}
                  joined your {gameName} room —{' '}
                  <Link className="activity-feed__link" to={`/rooms/${entry.roomId}`}>
                    {roomLabel({ name: entry.roomName, code: entry.roomCode })}
                  </Link>
                  .
                  <div className="activity-feed__time">{formatAbsoluteTime(entry.createdAt)}</div>
                </div>
              </div>
            );
          }

          if (entry.type === 'game_started') {
            const gameName = gameNames[entry.gameType] || 'a game';
            return (
              <div className="activity-feed__row" key={entry.id}>
                <div className="activity-feed__icon">🚀</div>
                <div className="activity-feed__info">
                  {gameName} is starting —{' '}
                  <Link className="activity-feed__link" to={`/rooms/${entry.roomId}`}>
                    {roomLabel({ name: entry.roomName, code: entry.roomCode })}
                  </Link>
                  .
                  <div className="activity-feed__time">{formatAbsoluteTime(entry.createdAt)}</div>
                </div>
              </div>
            );
          }

          return (
            <div className="activity-feed__row" key={entry.id}>
              <div className="activity-feed__icon">{entry.type === 'game_won' ? '🏆' : '🎲'}</div>
              <div className="activity-feed__info">
                {describeGameResult(entry, gameNames)}
                <div className="activity-feed__time">{formatAbsoluteTime(entry.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
