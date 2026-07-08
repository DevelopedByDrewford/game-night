import styled from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { colorForId } from '../../utils/colors.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/friends', label: 'Friends' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 32px;
  border-bottom: 1px solid rgba(46, 32, 19, 0.12);
  background: ${({ theme }) => theme.colors.surface};
  flex-wrap: wrap;
  gap: 16px;
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    display: none;
  }
`;

const Links = styled.div`
  display: flex;
  gap: 28px;
  align-items: center;
`;

const StyledLink = styled(NavLink)`
  font-size: 15px;
  font-weight: 500;
  color: rgba(46, 32, 19, 0.55);
  text-decoration: none;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  padding-bottom: 4px;

  &.active {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.ink};
    border-bottom-color: ${({ theme }) => theme.colors.terracotta};
  }
`;

const BottomBar = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px 0 calc(16px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(46, 32, 19, 0.1);
    background: ${({ theme }) => theme.colors.surface};
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
  }
`;

const TabItem = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  text-decoration: none;
  color: rgba(46, 32, 19, 0.55);

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(46, 32, 19, 0.55);
  }

  span {
    font-size: 10px;
    font-weight: 500;
  }

  &.active {
    color: ${({ theme }) => theme.colors.ink};

    .dot {
      background: ${({ theme }) => theme.colors.terracotta};
    }

    span {
      font-weight: 800;
    }
  }
`;

export function NavBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const avatarColor = colorForId(user?.uid || '');

  return (
    <>
      <TopBar>
        <Logo onClick={() => navigate('/dashboard')} />
        <Links>
          {NAV_ITEMS.map((item) => (
            <StyledLink key={item.to} to={item.to}>
              {item.label}
            </StyledLink>
          ))}
          <Avatar
            size={38}
            color={avatarColor}
            imageUrl={profile?.avatarUrl}
            onClick={() => navigate('/profile')}
          />
        </Links>
      </TopBar>

      <BottomBar>
        {NAV_ITEMS.map((item) => (
          <TabItem key={item.to} to={item.to}>
            <span className="dot" />
            <span>{item.label}</span>
          </TabItem>
        ))}
      </BottomBar>
    </>
  );
}
