import styled from 'styled-components';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
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

const CardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

// Copy + whether an action button shows, per usePushNotifications status.
const NOTIFICATION_COPY = {
  checking: { description: 'Checking this device…' },
  unsupported: { description: "Turn notifications aren't supported in this browser." },
  'needs-install': {
    description:
      'Add Game Night to your Home Screen first — tap Share, then "Add to Home Screen" — and open it from that icon to turn this on.',
  },
  default: { description: "Get notified on this device when it's your turn.", action: 'enable', label: 'Enable Notifications' },
  denied: {
    description: "Notifications are blocked for this device. Enable them in your phone's Settings app, then reload this page.",
  },
  enabling: { description: 'Enabling…', action: 'enable', label: 'Enabling…', disabled: true },
  enabled: { description: 'Turn notifications are on for this device.', action: 'disable', label: 'Turn Off' },
  error: { description: 'Something went wrong enabling notifications.', action: 'enable', label: 'Try Again' },
};

export function SettingsContainer() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const themeMode = profile?.themeMode || 'dark';
  const { status, enable, disable } = usePushNotifications();

  function handleChange(mode) {
    updateProfile({ uid: user.uid, data: { themeMode: mode } }).catch((err) =>
      console.error('[SettingsContainer] failed to save theme preference', err)
    );
  }

  const notifCopy = NOTIFICATION_COPY[status] || NOTIFICATION_COPY.checking;

  return (
    <PageWrap $maxWidth="640px" $padding="44px 32px">
      <Title>Settings</Title>
      <CardStack>
        <Card>
          <Label>Appearance</Label>
          <Description>Choose how Game Night looks on this account.</Description>
          <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={handleChange} />
        </Card>

        <Card>
          <Label>Turn Notifications</Label>
          <Description>{notifCopy.description}</Description>
          {notifCopy.action === 'enable' && (
            <Button onClick={enable} disabled={notifCopy.disabled}>
              {notifCopy.label}
            </Button>
          )}
          {notifCopy.action === 'disable' && (
            <Button $variant="outline" onClick={disable}>
              {notifCopy.label}
            </Button>
          )}
        </Card>
      </CardStack>
    </PageWrap>
  );
}
