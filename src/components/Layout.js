import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu.jsx';   // ⭐ new import

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isRsip = location.pathname.startsWith('/rsip');

  const handleMainChainNavigate = () => {
    if (location.pathname !== '/timer') {
      navigate('/timer');
    }
  };

  const handleAuxiliaryNavigate = () => {
    if (location.pathname !== '/auxiliary-timer') {
      navigate('/auxiliary-timer');
    }
  };

  return (
    <div className={`app-shell${isRsip ? ' app-shell--rsip' : ''}`}>
      <header className="top-nav">
        <div className="top-nav__inner">
          <NavLink to="/" className="top-nav__brand">
            Focusmaxxing
          </NavLink>

          <nav className="top-nav__tabs">
            <NavLink
              to="/"
              end={false}
              className={() =>
                `top-nav__tab${['/', '/timer', '/auxiliary-timer', '/core-principles'].includes(
                  location.pathname
                )
                  ? ' top-nav__tab--active'
                  : ''
                }`
              }
            >
              Sacred Seat
            </NavLink>
            <NavLink
              to="/rsip"
              className={({ isActive }) =>
                `top-nav__tab${isActive ? ' top-nav__tab--active' : ''}`
              }
            >
              Habit Tree
            </NavLink>
          </nav>

          <div className="top-nav__auth">
            {!user ? (
              <>
                <NavLink to="/login" className="top-nav__login">
                  Log In
                </NavLink>
                <NavLink to="/signup" className="top-nav__signup">
                  Sign Up
                </NavLink>
              </>
            ) : (
              // ⭐ When logged in, show profile menu instead of text + Logout button
              <UserMenu />
            )}
          </div>
        </div>
      </header>

      {isRsip ? (
        <main className="whiteboard whiteboard--rsip">
          <Outlet />
        </main>
      ) : (
        <main className="whiteboard" style={{ flexDirection: 'column' }}>
          {['/', '/timer', '/auxiliary-timer', '/core-principles'].includes(location.pathname) && (
            <div className="sacred-nav">
              <button
                type="button"
                className={`sacred-nav__button${location.pathname === '/auxiliary-timer' ? ' sacred-nav__button--active' : ''
                  }`}
                onClick={handleAuxiliaryNavigate}
              >
                Reservation Timer
              </button>
              <button
                type="button"
                className={`sacred-nav__button${location.pathname === '/timer' ? ' sacred-nav__button--active' : ''
                  }`}
                onClick={handleMainChainNavigate}
              >
                Main Timer
              </button>
            </div>
          )}
          <Outlet />
        </main>
      )}
    </div>
  );
};

export default Layout;
