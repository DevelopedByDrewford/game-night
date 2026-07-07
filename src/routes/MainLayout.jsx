import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/layout/NavBar.jsx';

export function MainLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
