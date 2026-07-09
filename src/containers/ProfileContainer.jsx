import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useGameCatalog } from '../hooks/useGameCatalog.js';
import { useFollowing } from '../hooks/useFollowing.js';
import { updateProfile } from '../utils/profile.js';
import { followUser } from '../utils/follows.js';
import { colorForId } from '../utils/colors.js';
import './ProfileContainer.css';

function formatJoinDate(timestamp) {
  if (!timestamp?.toDate) return 'recently';
  return timestamp.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function EditProfileForm({ profile, onCancel, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    pronouns: profile?.pronouns || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatarUrl || '',
    bannerUrl: profile?.bannerUrl || '',
    linkUrl: profile?.externalLink?.url || '',
    linkLabel: profile?.externalLink?.label || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        uid: user.uid,
        data: {
          displayName: form.displayName.trim() || 'Player',
          pronouns: form.pronouns.trim(),
          location: form.location.trim(),
          bio: form.bio.trim().slice(0, 280),
          avatarUrl: form.avatarUrl.trim(),
          bannerUrl: form.bannerUrl.trim(),
          externalLink: form.linkUrl.trim()
            ? { url: normalizeUrl(form.linkUrl), label: form.linkLabel.trim() || form.linkUrl.trim() }
            : null,
        },
      });
      onSaved();
    } catch (err) {
      console.error('[ProfileContainer] failed to save profile', err);
      setError("Couldn't save your profile — try again.");
      setSaving(false);
    }
  }

  return (
    <form className="profile-edit-card" onSubmit={handleSave}>
      <div className="profile-field-row">
        <div className="profile-field">
          <label className="profile-field-label">Display name</label>
          <input className="profile-text-input" value={form.displayName} onChange={set('displayName')} maxLength={40} />
        </div>
        <div className="profile-field">
          <label className="profile-field-label">Pronouns</label>
          <input
            className="profile-text-input"
            value={form.pronouns}
            onChange={set('pronouns')}
            placeholder="she/her"
            maxLength={30}
          />
        </div>
      </div>

      <div className="profile-field">
        <label className="profile-field-label">Location</label>
        <input
          className="profile-text-input"
          value={form.location}
          onChange={set('location')}
          placeholder="Portland, OR"
          maxLength={60}
        />
      </div>

      <div className="profile-field">
        <label className="profile-field-label">Bio</label>
        <textarea
          className="profile-text-area"
          value={form.bio}
          onChange={set('bio')}
          maxLength={280}
          placeholder="A little about you…"
        />
      </div>

      <div className="profile-field-row">
        <div className="profile-field">
          <label className="profile-field-label">Avatar image URL</label>
          <input className="profile-text-input" value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://…" />
        </div>
        <div className="profile-field">
          <label className="profile-field-label">Banner image URL</label>
          <input className="profile-text-input" value={form.bannerUrl} onChange={set('bannerUrl')} placeholder="https://…" />
        </div>
      </div>

      <div className="profile-field-row">
        <div className="profile-field">
          <label className="profile-field-label">External link</label>
          <input className="profile-text-input" value={form.linkUrl} onChange={set('linkUrl')} placeholder="https://…" />
        </div>
        <div className="profile-field">
          <label className="profile-field-label">Link label</label>
          <input
            className="profile-text-input"
            value={form.linkLabel}
            onChange={set('linkLabel')}
            placeholder="My blog"
            maxLength={40}
          />
        </div>
      </div>

      {error && <div className="profile-error-text">{error}</div>}

      <div className="profile-edit-actions">
        <Button type="submit" disabled={saving}>
          Save
        </Button>
        <Button type="button" $variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FollowBackButton({ targetUid }) {
  const { user } = useAuth();
  const { friends } = useFollowing();
  const [busy, setBusy] = useState(false);
  const alreadyFollowing = friends.some((f) => f.uid === targetUid);

  async function handleClick() {
    setBusy(true);
    try {
      await followUser({ uid: user.uid, targetUid });
    } catch (err) {
      console.error('[ProfileContainer] failed to follow', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button $variant="outline" disabled={alreadyFollowing || busy} onClick={handleClick}>
      {alreadyFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}

export function ProfileContainer() {
  const { uid: routeUid } = useParams();
  const { user } = useAuth();
  const { profile, loading: profileLoading, isOwnProfile } = useProfile(routeUid);
  const { games, loading: catalogLoading } = useGameCatalog();
  const { friends } = useFollowing();
  const [editing, setEditing] = useState(false);

  if (profileLoading || catalogLoading) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <div className="profile-status-text">Loading profile…</div>
      </PageWrap>
    );
  }

  if (!profile && !isOwnProfile) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <div className="profile-status-text">That player couldn't be found.</div>
      </PageWrap>
    );
  }

  const targetUid = routeUid || user?.uid;
  const displayName = profile?.displayName || (isOwnProfile ? user?.displayName : null) || 'Player';
  const avatarColor = colorForId(targetUid || '');

  if (editing) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <div className="profile-stats-title">Edit profile</div>
        <EditProfileForm profile={profile} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      </PageWrap>
    );
  }

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <div className="profile-top-row">
        {isOwnProfile ? (
          <Button $variant="outline" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <FollowBackButton targetUid={targetUid} />
        )}
      </div>

      <div
        className={`profile-hero${profile?.bannerUrl ? ' profile-hero--banner' : ''}`}
        style={
          profile?.bannerUrl
            ? { backgroundImage: `linear-gradient(rgba(46,32,19,.15), rgba(46,32,19,.15)), url(${profile.bannerUrl})` }
            : undefined
        }
      >
        <Avatar size={88} color={avatarColor} imageUrl={profile?.avatarUrl} borderWidth={2} borderColor="rgba(46,32,19,.22)" />
        <div>
          <div className="profile-name-row">
            <div className="profile-name">{displayName}</div>
            {profile?.pronouns && <div className="profile-pronouns">({profile.pronouns})</div>}
          </div>
          <div className="profile-meta">
            Joined {formatJoinDate(profile?.createdAt)}
            {isOwnProfile && (
              <>
                {' '}
                · {friends.length} friend
                {friends.length === 1 ? '' : 's'}
              </>
            )}
          </div>
          {profile?.location && <div className="profile-location">📍 {profile.location}</div>}
        </div>
      </div>

      {profile?.bio && <div className="profile-bio">{profile.bio}</div>}
      {profile?.externalLink?.url && (
        <div>
          <a className="profile-external-link" href={profile.externalLink.url} target="_blank" rel="noopener noreferrer">
            🔗 {profile.externalLink.label || profile.externalLink.url}
          </a>
        </div>
      )}

      {isOwnProfile && (
        <div className="profile-id-row">
          Your user ID (share this so friends can follow you):
          <span className="profile-id-value">{user?.uid}</span>
          <button className="profile-copy-button" onClick={() => navigator.clipboard?.writeText(user?.uid || '')}>
            Copy
          </button>
        </div>
      )}

      <div className="profile-stats-title">Stats by game</div>
      <div className="profile-stats-list">
        {games.map((game) => {
          const stat = profile?.stats?.[game.id];
          const wins = stat?.wins || 0;
          const gamesPlayed = stat?.gamesPlayed || 0;
          const losses = Math.max(0, gamesPlayed - wins);
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

          return (
            <div className={`profile-stat-row${game.active ? ' profile-stat-row--live' : ''}`} key={game.id}>
              <div className={`profile-stat-thumb${game.active ? ' profile-stat-thumb--live' : ''}`} />
              <div>
                <div className="profile-stat-name">{game.displayName || game.id}</div>
                {game.active ? (
                  <div className="profile-stat-detail profile-stat-detail--live">
                    {wins}W – {losses}L · {winRate}% win rate
                  </div>
                ) : (
                  <div className="profile-stat-detail">Coming soon</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}
