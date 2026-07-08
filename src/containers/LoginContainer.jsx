import styled from 'styled-components';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Logo } from '../components/ui/Logo.jsx';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  padding: 24px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 44px 40px;
  max-width: 360px;
  width: 100%;
  text-align: center;
`;

const LogoRow = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: rgba(46, 32, 19, 0.6);
  margin: 10px 0 30px;
`;

const GoogleButton = styled.button`
  width: 100%;
  background: ${({ theme }) => theme.colors.terracotta};
  color: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: 14px;
  font-weight: 700;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.button};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ConfigWarning = styled.p`
  font-size: 12px;
  color: rgba(46, 32, 19, 0.5);
  margin-top: 18px;
`;

export function LoginContainer() {
  const { user, loading, signInWithGoogle, isFirebaseConfigured } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <Page>
      <Card>
        <LogoRow>
          <Logo size={56} fontSize={30} showWordmark={false} />
        </LogoRow>
        <div style={{ fontFamily: "'Bree Serif', serif", fontSize: 30, letterSpacing: '-1px', color: '#2e2013' }}>
          Game Night
        </div>
        <Subtitle>Pull up a chair. Sign in to see your games.</Subtitle>
        <GoogleButton onClick={signInWithGoogle} disabled={!isFirebaseConfigured}>
          Sign in with Google
        </GoogleButton>
        {!isFirebaseConfigured && (
          <ConfigWarning>
            Firebase isn't configured yet — add your project keys to .env.local to enable sign-in.
          </ConfigWarning>
        )}
      </Card>
    </Page>
  );
}
