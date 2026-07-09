import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { colorForId } from '../../utils/colors.js';
import './NavBar.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/friends', label: 'Friends' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

export function NavBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const avatarColor = colorForId(user?.uid || '');

  return (
    <>
      <div className="navbar-top">
        <Logo onClick={() => navigate('/dashboard')} />
        <div className="navbar-links">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} className="navbar-link" to={item.to}>
              {item.label}
            </NavLink>
          ))}
          <Avatar
            size={38}
            color={avatarColor}
            imageUrl={profile?.avatarUrl}
            borderColor="rgba(245, 230, 199, 0.35)"
            onClick={() => navigate('/profile')}
          />
        </div>
      </div>

      <div className="navbar-bottom">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} className="navbar-tab" to={item.to}>
            <span className="navbar-tab__dot" />
            <span className="navbar-tab__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
}
