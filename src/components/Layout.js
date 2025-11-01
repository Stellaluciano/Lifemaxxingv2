import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__inner">
          <NavLink to="/" className="top-nav__brand">
            Lifemaxxing
          </NavLink>
          <nav className="top-nav__tabs">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `top-nav__tab${isActive ? ' top-nav__tab--active' : ''}`
              }
            >
              CTDP
            </NavLink>
            <button type="button" className="top-nav__tab top-nav__tab--disabled">
              RSIP
            </button>
          </nav>
        </div>
      </header>
      <div className="content-area">
        <aside className="sidebar">
          <button type="button" className="sidebar__button">
            Main Chain
          </button>
          <button type="button" className="sidebar__button">
            Auxiliary Chain
          </button>
          <button type="button" className="sidebar__button">
            3 Core Principles
          </button>
        </aside>
        <main className="whiteboard">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
