import { ThemeProvider } from 'styled-components';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme.js';
import { GlobalStyle } from './styles/GlobalStyle.js';
import { Background } from './components/layout/Background.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { usePresence } from './hooks/usePresence.js';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { MainLayout } from './routes/MainLayout.jsx';
import { LoginContainer } from './containers/LoginContainer.jsx';
import { DashboardContainer } from './containers/DashboardContainer.jsx';
import { CatalogContainer } from './containers/CatalogContainer.jsx';
import { FriendsContainer } from './containers/FriendsContainer.jsx';
import { ProfileContainer } from './containers/ProfileContainer.jsx';
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
          </Route>

          <Route path="/rooms/new" element={<CreateRoomContainer />} />
          <Route path="/rooms/:roomId" element={<RoomContainer />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
