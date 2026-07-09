import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Background } from './components/layout/Background.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { usePresence } from './hooks/usePresence.js';
import { useProfile } from './hooks/useProfile.js';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { MainLayout } from './routes/MainLayout.jsx';
import { LoginContainer } from './containers/LoginContainer.jsx';
import { DashboardContainer } from './containers/DashboardContainer.jsx';
import { CatalogContainer } from './containers/CatalogContainer.jsx';
import { FriendsContainer } from './containers/FriendsContainer.jsx';
import { ProfileContainer } from './containers/ProfileContainer.jsx';
import { SettingsContainer } from './containers/SettingsContainer.jsx';
import { CreateRoomContainer } from './containers/CreateRoomContainer.jsx';
import { RoomContainer } from './containers/RoomContainer.jsx';

function AppShell() {
  usePresence();

  return (
    <BrowserRouter>
      <Background />
      <Routes>
        <Route path="/login" element={<LoginContainer />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardContainer />} />
            <Route path="/catalog" element={<CatalogContainer />} />
            <Route path="/friends" element={<FriendsContainer />} />
            <Route path="/profile" element={<ProfileContainer />} />
            <Route path="/profile/:uid" element={<ProfileContainer />} />
            <Route path="/settings" element={<SettingsContainer />} />
          </Route>

          <Route path="/rooms/new/:gameType" element={<CreateRoomContainer />} />
          <Route path="/rooms/:roomId" element={<RoomContainer />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ThemedApp() {
  const { profile } = useProfile();
  const themeMode = profile?.themeMode === 'light' ? 'light' : 'dark';

  // Drives styles/variables.css's [data-theme] selectors — the whole app
  // is plain CSS now, no styled-components ThemeProvider needed.
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  return <AppShell />;
}

function App() {
  return (
    <AuthProvider>
      <ThemedApp />
    </AuthProvider>
  );
}

export default App;
