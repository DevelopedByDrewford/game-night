import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Logo } from '../components/ui/Logo.jsx';
import './LoginContainer.css';

export function LoginContainer() {
  const { user, loading, signInWithGoogle, isFirebaseConfigured } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-row">
          <Logo size={56} fontSize={30} showWordmark={false} />
        </div>
        <div className="login-wordmark">Game Night</div>
        <p className="login-subtitle">Pull up a chair. Sign in to see your games.</p>
        <button className="login-google-button" onClick={signInWithGoogle} disabled={!isFirebaseConfigured}>
          Sign in with Google
        </button>
        {!isFirebaseConfigured && (
          <p className="login-config-warning">
            Firebase isn't configured yet — add your project keys to .env.local to enable sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
