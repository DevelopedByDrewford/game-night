import styled from 'styled-components';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { updateProfile } from '../utils/profile.js';

const Title = styled.h1`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 32px;
  margin: 0 0 24px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Label = styled.div`
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 4px;
  color: #2e2013;
`;

const Description = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.6);
  margin-bottom: 16px;
`;

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function SettingsContainer() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const themeMode = profile?.themeMode || 'dark';

  function handleChange(mode) {
    updateProfile({ uid: user.uid, data: { themeMode: mode } }).catch((err) =>
      console.error('[SettingsContainer] failed to save theme preference', err)
    );
  }

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <Title>Settings</Title>
      <Card>
        <Label>Appearance</Label>
        <Description>Choose how Game Night looks on this account.</Description>
        <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={handleChange} />
      </Card>
    </PageWrap>
  );
}
