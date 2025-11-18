import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';

const UserMenu = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }
    const profileDoc = doc(db, 'users', user.uid, 'profile', 'details');
    const unsubscribe = onSnapshot(
      profileDoc,
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.warn('Failed to subscribe to profile', error);
        setProfile(null);
      }
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!user) {
    return null;
  }

  const fallbackBase = user.displayName || user.email.split('@')[0];
  const baseName = (profile?.firstName ?? '').trim() || fallbackBase;
  const firstToken = baseName.trim().split(' ')[0];
  const greeting = `Hi, ${firstToken}!`;

  return (
    <div className="top-nav__user-menu" ref={menuRef}>
      <button type="button" className="top-nav__profile" onClick={() => setOpen((prev) => !prev)}>
        <span>{greeting}</span>
      </button>
      {open && (
        <div className="top-nav__dropdown">
          <NavLink to="/profile" className="top-nav__dropdown-item" onClick={() => setOpen(false)}>
            Profile
          </NavLink>
          <NavLink to="/wishlist" className="top-nav__dropdown-item" onClick={() => setOpen(false)}>
            My Wishlist
          </NavLink>
          <button
            type="button"
            className="top-nav__dropdown-item top-nav__dropdown-item--danger"
            onClick={() => auth.signOut()}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
