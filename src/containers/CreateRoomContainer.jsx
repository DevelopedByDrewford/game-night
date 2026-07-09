import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const RULESET_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'extended', label: 'Extended (Spy & Chancellor)' },
];

export function CreateRoomContainer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playerCount, setPlayerCount] = useState(4);
  const [ruleset, setRuleset] = useState('classic');
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

  // Classic's 16-card deck can't seat more than 4 — force-switch to Extended
  // once the host goes above that, but never force back to Classic when
  // they drop back down (a host who deliberately opted into Extended at a
  // smaller player count gets to keep that choice — that's the "some
  // customization" on top of the player-count-based default).
  useEffect(() => {
    if (playerCount > 4 && ruleset !== 'extended') setRuleset('extended');
  }, [playerCount, ruleset]);

  const rulesetOptions = playerCount > 4 ? RULESET_OPTIONS.filter((o) => o.value !== 'classic') : RULESET_OPTIONS;

  // Create the room doc as soon as this screen opens (with default settings)
  // so the invite code is real and shareable immediately; final player
  // count/ruleset/auto-skip choices are saved when "Create Room" is clicked.
  useEffect(() => {
    if (!user || createStarted.current) return;
    createStarted.current = true;

    createRoom({
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
        <div className="create-room-subtitle">Love Letter · configure before you invite friends.</div>

        <div className="create-room-card">
          <div>
            <div className="create-room-section-label">Player count</div>
            <div className="create-room-stepper-row">
              <button className="create-room-stepper-button" onClick={() => setPlayerCount((c) => Math.max(2, c - 1))}>
                –
              </button>
              <div className="create-room-stepper-value">{playerCount}</div>
              <button className="create-room-stepper-button" onClick={() => setPlayerCount((c) => Math.min(6, c + 1))}>
                +
              </button>
              <div className="create-room-stepper-hint">players (2–6)</div>
            </div>
          </div>

          <div>
            <div className="create-room-section-label">Ruleset</div>
            <SegmentedControl options={rulesetOptions} value={ruleset} onChange={setRuleset} />
            {playerCount > 4 && (
              <div className="create-room-stepper-hint" style={{ marginTop: 8 }}>
                5-6 player games always use the Extended deck (adds Spy &amp; Chancellor).
              </div>
            )}
          </div>

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
