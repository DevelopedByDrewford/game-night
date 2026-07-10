import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFollowing } from '../hooks/useFollowing.js';
import { usePresenceMap } from '../hooks/usePresenceMap.js';
import { createRoom, inviteToRoom } from '../utils/rooms.js';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';
import { InviteFriendsModal } from '../components/game/InviteFriendsModal.jsx';
import './CreateRoomContainer.css';

// Per-game defaults/constraints for this screen — a 3rd game slots in just
// by adding an entry here, no new booleans needed. `fixedPlayerCount` (set
// for head-to-head-only games like A Little Wordy) hides the stepper
// entirely; `rulesetOptions: null` hides the ruleset picker entirely.
const GAME_CONFIG = {
  'love-letter': {
    displayName: 'Love Letter',
    minPlayers: 2,
    maxPlayers: 6,
    fixedPlayerCount: null,
    defaultPlayerCount: 4,
    rulesetOptions: [
      { value: 'classic', label: 'Classic' },
      { value: 'extended', label: 'Extended (Spy & Chancellor)' },
    ],
    defaultRuleset: 'classic',
  },
  'a-little-wordy': {
    displayName: 'A Little Wordy',
    minPlayers: 2,
    maxPlayers: 2,
    fixedPlayerCount: 2,
    defaultPlayerCount: 2,
    rulesetOptions: null,
    defaultRuleset: null,
  },
  'side-effects': {
    displayName: 'Side Effects',
    minPlayers: 2,
    maxPlayers: 8,
    fixedPlayerCount: null,
    defaultPlayerCount: 4,
    rulesetOptions: [
      { value: 'base', label: 'Base' },
      { value: 'booster', label: 'Booster Shot' },
    ],
    defaultRuleset: 'base',
  },
};

export function CreateRoomContainer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gameType = 'love-letter' } = useParams();
  const config = GAME_CONFIG[gameType] || GAME_CONFIG['love-letter'];

  const [playerCount, setPlayerCount] = useState(config.defaultPlayerCount);
  const [roomName, setRoomName] = useState('');
  const [ruleset, setRuleset] = useState(config.defaultRuleset || '');
  const [autoSkip, setAutoSkip] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const createStarted = useRef(false);

  const { friends } = useFollowing();
  const friendPresence = usePresenceMap(friends.map((f) => f.uid));
  const [invitedUids, setInvitedUids] = useState(new Set());
  const [inviteBusyUid, setInviteBusyUid] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Love Letter only: Classic's 16-card deck can't seat more than 4 —
  // force-switch to Extended once the host goes above that, but never force
  // back to Classic when they drop back down (a host who deliberately
  // opted into Extended at a smaller player count gets to keep that
  // choice). Side Effects' Base/Booster ruleset isn't player-count-gated,
  // so this doesn't apply to it.
  useEffect(() => {
    if (gameType === 'love-letter' && playerCount > 4 && ruleset !== 'extended') setRuleset('extended');
  }, [gameType, playerCount, ruleset]);

  const rulesetOptions =
    gameType === 'love-letter' && playerCount > 4
      ? config.rulesetOptions.filter((o) => o.value !== 'classic')
      : config.rulesetOptions;

  // Create the room doc as soon as this screen opens (with default settings)
  // so the invite code is real and shareable immediately; final player
  // count/ruleset/auto-skip choices are saved when "Create Room" is clicked.
  useEffect(() => {
    if (!user || createStarted.current) return;
    createStarted.current = true;

    createRoom({
      gameType,
      hostUid: user.uid,
      hostDisplayName: user.displayName || 'Host',
      playerCount,
      ruleset,
      autoSkip,
    })
      .then(setRoom)
      .catch((err) => {
        console.error('[CreateRoomContainer] failed to create room', err);
        setError("Couldn't create a room — check your Firebase setup and try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleInvite(targetUid) {
    if (!room) return;
    setInviteBusyUid(targetUid);
    setError(null);
    try {
      await inviteToRoom({ roomId: room.roomId, targetUid });
      setInvitedUids((prev) => new Set(prev).add(targetUid));
    } catch (err) {
      console.error('[CreateRoomContainer] failed to invite', err);
      setError("Couldn't send that invite — try again.");
    } finally {
      setInviteBusyUid(null);
    }
  }

  async function handleCreate() {
    if (!room) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'gameRooms', room.roomId), {
        name: roomName.trim() || null,
        settings: { playerCount, ruleset, autoSkipEnabled: autoSkip, autoSkipMinutes: 10 },
        updatedAt: serverTimestamp(),
      });
      navigate(`/rooms/${room.roomId}`);
    } catch (err) {
      console.error('[CreateRoomContainer] failed to save room settings', err);
      setError("Couldn't save your settings — try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <RoomChromeHeader title="Set Up Your Table" />
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <div className="create-room-title">Set Up Your Table</div>
        <div className="create-room-subtitle">{config.displayName} · configure before you invite friends.</div>

        <div className="create-room-card">
          <div>
            <div className="create-room-section-label">Room name (optional)</div>
            <input
              className="create-room-text-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={room?.code ? `Room ${room.code}` : 'e.g. Friday Night'}
              maxLength={40}
            />
            <div className="create-room-stepper-hint" style={{ marginTop: 6 }}>
              Doesn't need to be unique — your invite code still works normally either way.
            </div>
          </div>

          <div>
            <div className="create-room-section-label">Player count</div>
            {config.fixedPlayerCount ? (
              <div className="create-room-stepper-hint">
                {config.fixedPlayerCount} players — {config.displayName} is a head-to-head game.
              </div>
            ) : (
              <div className="create-room-stepper-row">
                <button
                  className="create-room-stepper-button"
                  onClick={() => setPlayerCount((c) => Math.max(config.minPlayers, c - 1))}
                >
                  –
                </button>
                <div className="create-room-stepper-value">{playerCount}</div>
                <button
                  className="create-room-stepper-button"
                  onClick={() => setPlayerCount((c) => Math.min(config.maxPlayers, c + 1))}
                >
                  +
                </button>
                <div className="create-room-stepper-hint">
                  players ({config.minPlayers}–{config.maxPlayers})
                </div>
              </div>
            )}
          </div>

          {config.rulesetOptions && (
            <div>
              <div className="create-room-section-label">Ruleset</div>
              <SegmentedControl options={rulesetOptions} value={ruleset} onChange={setRuleset} />
              {gameType === 'love-letter' && playerCount > 4 && (
                <div className="create-room-stepper-hint" style={{ marginTop: 8 }}>
                  5-6 player games always use the Extended deck (adds Spy &amp; Chancellor).
                </div>
              )}
              {gameType === 'side-effects' && ruleset === 'booster' && (
                <div className="create-room-stepper-hint" style={{ marginTop: 8 }}>
                  Adds Misdiagnosis &amp; High Tolerance to the deck.
                </div>
              )}
            </div>
          )}

          <div className="create-room-toggle-row">
            <div>
              <div className="create-room-toggle-title">Auto-skip inactive players</div>
              <div className="create-room-toggle-desc">Skip a turn if a player doesn't act in time</div>
            </div>
            <Toggle checked={autoSkip} onChange={setAutoSkip} />
          </div>

          <div className="create-room-invite-section">
            <div className="create-room-section-label">Invite code</div>
            <div className="create-room-invite-row">
              <div className="create-room-code">{room?.code || '····'}</div>
              <button
                className="create-room-small-button create-room-small-button--mustard"
                disabled={!room}
                onClick={() => navigator.clipboard?.writeText(room.code)}
              >
                Copy
              </button>
              <button className="create-room-small-button create-room-small-button--avocado" disabled={!room}>
                Share
              </button>
            </div>
            <button
              className="create-room-small-button"
              style={{ marginTop: 10, width: '100%' }}
              disabled={!room}
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Friends
            </button>
          </div>

          {error && <div className="create-room-error-text">{error}</div>}

          <Button $fullWidth disabled={!room || submitting} onClick={handleCreate}>
            Create Room →
          </Button>
        </div>
      </PageWrap>

      {inviteModalOpen && room && (
        <InviteFriendsModal
          friends={friends}
          presence={friendPresence}
          invitedUids={invitedUids}
          busyUid={inviteBusyUid}
          onInvite={handleInvite}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </>
  );
}
