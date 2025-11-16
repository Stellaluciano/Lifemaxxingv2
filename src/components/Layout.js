import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
            Lifemaxxing
          </NavLink>
          <nav className="top-nav__tabs">
            <NavLink
              to="/"
              end={false}
              className={({ isActive }) =>
                `top-nav__tab${isActive && !isRsip ? ' top-nav__tab--active' : ''}`
              }
            >
              CTDP
            </NavLink>
            <NavLink
              to="/rsip"
              className={({ isActive }) =>
                `top-nav__tab${isActive ? ' top-nav__tab--active' : ''}`
              }
            >
              RSIP
            </NavLink>
          </nav>
        </div>
      </header>
      {isRsip ? (
        <main className="whiteboard whiteboard--rsip">
          <Outlet />
        </main>
      ) : (
        <div className="content-area">
          <aside className="sidebar">
            <button
              type="button"
              className={`sidebar__button${
                location.pathname === '/timer' ? ' sidebar__button--active' : ''
              }`}
              onClick={handleMainChainNavigate}
            >
              Main Timer
            </button>
            <button
              type="button"
              className={`sidebar__button${
                location.pathname === '/auxiliary-timer' ? ' sidebar__button--active' : ''
              }`}
              onClick={handleAuxiliaryNavigate}
            >
              Auxiliary Timer
            </button>
            <div className="sidebar__spacer" />
            <NavLink
              to="/core-principles"
              className={({ isActive }) =>
                `sidebar__button sidebar__button--link${
                  isActive ? ' sidebar__button--active' : ''
                }`
              }
            >
              3 Core Principles
            </NavLink>
          </aside>
          <main className="whiteboard">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
};

export default Layout;
