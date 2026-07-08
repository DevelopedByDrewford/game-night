import { useState } from 'react';
import styled from 'styled-components';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useGameCatalog } from '../hooks/useGameCatalog.js';
import { useFollowing } from '../hooks/useFollowing.js';
import { updateProfile } from '../utils/profile.js';
import { colorForId } from '../utils/colors.js';

const TopRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`;

const Hero = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 20px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  padding: 26px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  ${({ $bannerUrl }) =>
    $bannerUrl
      ? `
    background-image: linear-gradient(rgba(46,32,19,.15), rgba(46,32,19,.15)), url(${$bannerUrl});
    background-size: cover;
    background-position: center;
  `
      : `
    background-color: #f6e9ce;
    background-image: radial-gradient(circle, rgba(200, 89, 47, 0.18) 1.5px, transparent 1.7px),
      radial-gradient(circle, rgba(227, 167, 62, 0.18) 1.5px, transparent 1.7px),
      radial-gradient(circle, rgba(124, 140, 74, 0.18) 1.5px, transparent 1.7px);
    background-size: 14px 14px, 14px 14px, 14px 14px;
    background-position: 0 0, 5px 7px, 9px 2px;
  `}
`;

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 38px;
  letter-spacing: -1px;
  color: #2e2013;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
`;

const Pronouns = styled.div`
  font-size: 15px;
  color: rgba(46, 32, 19, 0.55);
`;

const Meta = styled.div`
  font-size: 14px;
  color: rgba(46, 32, 19, 0.6);
  margin-top: 2px;
`;

const Location = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.55);
  margin-top: 4px;
`;

const Bio = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ink};
  line-height: 1.5;
  margin-bottom: 16px;
  white-space: pre-wrap;
`;

const ExternalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.terracotta};
  text-decoration: none;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 6px 14px;
  margin-bottom: 30px;
`;

const StatsTitle = styled.div`
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 14px;
`;

const StatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const StatRow = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.cardSm};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: ${({ $live }) => ($live ? 1 : 0.5)};
  box-shadow: ${({ theme }) => theme.shadows.button};
`;

const StatThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: ${({ $stripe, theme }) => `repeating-linear-gradient(45deg, ${$stripe}33, ${$stripe}33 6px, ${theme.colors.surface} 6px, ${theme.colors.surface} 12px)`};
  flex: none;
`;

const StatName = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #2e2013;
`;

const StatDetail = styled.div`
  font-size: 13px;
  color: ${({ $live }) => (
    $live ? 'rgba(46, 32, 19, 0.6)' : 'rgba(46, 32, 19, 0.4)'
  )};
`;

const StatusText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

const IdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 30px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkFainter};
`;

const IdValue = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 3px 8px;
`;

const CopyButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
`;

const EditCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 30px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 14px;

  ${Field} {
    flex: 1;
  }
`;

const FieldLabel = styled.label`
  font-weight: 700;
  font-size: 13px;
  color: #2e2013;
`;

const inputStyles = `
  font-family: inherit;
  font-size: 14px;
  padding: 10px 14px;
  border-radius: 14px;
`;

const TextInput = styled.input`
  ${inputStyles}
  border: 1.5px solid rgba(46, 32, 19, 0.16);
  background: ${({ theme }) => theme.colors.pageBg};
`;

const TextArea = styled.textarea`
  ${inputStyles}
  border: 1.5px solid rgba(46, 32, 19, 0.16);
  background: ${({ theme }) => theme.colors.pageBg};
  resize: vertical;
  min-height: 70px;
`;

const EditActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ErrorText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.terracotta};
`;

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
    <EditCard as="form" onSubmit={handleSave}>
      <FieldRow>
        <Field>
          <FieldLabel>Display name</FieldLabel>
          <TextInput value={form.displayName} onChange={set('displayName')} maxLength={40} />
        </Field>
        <Field>
          <FieldLabel>Pronouns</FieldLabel>
          <TextInput value={form.pronouns} onChange={set('pronouns')} placeholder="she/her" maxLength={30} />
        </Field>
      </FieldRow>

      <Field>
        <FieldLabel>Location</FieldLabel>
        <TextInput value={form.location} onChange={set('location')} placeholder="Portland, OR" maxLength={60} />
      </Field>

      <Field>
        <FieldLabel>Bio</FieldLabel>
        <TextArea value={form.bio} onChange={set('bio')} maxLength={280} placeholder="A little about you…" />
      </Field>

      <FieldRow>
        <Field>
          <FieldLabel>Avatar image URL</FieldLabel>
          <TextInput value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://…" />
        </Field>
        <Field>
          <FieldLabel>Banner image URL</FieldLabel>
          <TextInput value={form.bannerUrl} onChange={set('bannerUrl')} placeholder="https://…" />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <FieldLabel>External link</FieldLabel>
          <TextInput value={form.linkUrl} onChange={set('linkUrl')} placeholder="https://…" />
        </Field>
        <Field>
          <FieldLabel>Link label</FieldLabel>
          <TextInput value={form.linkLabel} onChange={set('linkLabel')} placeholder="My blog" maxLength={40} />
        </Field>
      </FieldRow>

      {error && <ErrorText>{error}</ErrorText>}

      <EditActions>
        <Button type="submit" disabled={saving}>
          Save
        </Button>
        <Button type="button" $variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </EditActions>
    </EditCard>
  );
}

export function ProfileContainer() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { games, loading: catalogLoading } = useGameCatalog();
  const { friends } = useFollowing();
  const [editing, setEditing] = useState(false);

  if (profileLoading || catalogLoading) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <StatusText>Loading profile…</StatusText>
      </PageWrap>
    );
  }

  const displayName = profile?.displayName || user?.displayName || 'Player';
  const avatarColor = colorForId(user?.uid || '');

  if (editing) {
    return (
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <StatsTitle>Edit profile</StatsTitle>
        <EditProfileForm profile={profile} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      </PageWrap>
    );
  }

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <TopRow>
        <Button $variant="outline" onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
      </TopRow>

      <Hero $bannerUrl={profile?.bannerUrl}>
        <Avatar
          size={88}
          color={avatarColor}
          imageUrl={profile?.avatarUrl}
          borderWidth={2}
          borderColor="rgba(46,32,19,.22)"
        />
        <div>
          <NameRow>
            <Name>{displayName}</Name>
            {profile?.pronouns && <Pronouns>({profile.pronouns})</Pronouns>}
          </NameRow>
          <Meta>
            Joined {formatJoinDate(profile?.createdAt)} · {friends.length} friend
            {friends.length === 1 ? '' : 's'}
          </Meta>
          {profile?.location && <Location>📍 {profile.location}</Location>}
        </div>
      </Hero>

      {profile?.bio && <Bio>{profile.bio}</Bio>}
      {profile?.externalLink?.url && (
        <div>
          <ExternalLink href={profile.externalLink.url} target="_blank" rel="noopener noreferrer">
            🔗 {profile.externalLink.label || profile.externalLink.url}
          </ExternalLink>
        </div>
      )}

      <IdRow>
        Your user ID (share this so friends can follow you):
        <IdValue>{user?.uid}</IdValue>
        <CopyButton onClick={() => navigator.clipboard?.writeText(user?.uid || '')}>Copy</CopyButton>
      </IdRow>

      <StatsTitle>Stats by game</StatsTitle>
      <StatsList>
        {games.map((game) => {
          const stat = profile?.stats?.[game.id];
          const wins = stat?.wins || 0;
          const gamesPlayed = stat?.gamesPlayed || 0;
          const losses = Math.max(0, gamesPlayed - wins);
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

          return (
            <StatRow key={game.id} $live={game.active}>
              <StatThumb $stripe={game.active ? '#C8592F' : '#8a8272'} />
              <div>
                <StatName>{game.displayName || game.id}</StatName>
                {game.active ? (
                  <StatDetail $live>
                    {wins}W – {losses}L · {winRate}% win rate
                  </StatDetail>
                ) : (
                  <StatDetail>Coming soon</StatDetail>
                )}
              </div>
            </StatRow>
          );
        })}
      </StatsList>
    </PageWrap>
  );
}
