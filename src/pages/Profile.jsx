import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [dateJoined, setDateJoined] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const docRef = useMemo(() => {
    if (!user) {
      return null;
    }
    return doc(db, 'users', user.uid, 'profile', 'details');
  }, [user]);

  const loadProfile = useCallback(async () => {
    if (!docRef) {
      return;
    }
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return;
      }
      const data = snap.data();
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setDob(data.dob ?? '');
      setDateJoined(data.dateJoined?.toDate ? data.dateJoined.toDate() : data.dateJoined ?? null);
    } catch (error) {
      console.warn('Failed to load profile', error);
    }
  }, [docRef]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!docRef || !user) {
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        docRef,
        {
          firstName,
          lastName,
          dob,
          photoURL: '',
          updatedAt: serverTimestamp(),
          dateJoined: dateJoined ?? serverTimestamp(),
        },
        { merge: true }
      );
      setToast('Profile updated!');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      console.warn('Failed to save profile', error);
    } finally {
      setSaving(false);
    }
  };


  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <h1>Profile</h1>
          <p>Please log in to edit your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1 className="profile-card__title">Profile</h1>
        {dateJoined && (
          <p className="profile-date-joined">
            Officially Locked in since{' '}
            {new Date(dateJoined).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        <form className="profile-form" onSubmit={handleSave}>
          <label>
            First Name
            <input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label>
            Last Name
            <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label>
            Date of Birth
            <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
        {toast && <div className="profile-toast">{toast}</div>}
      </div>
    </div>
  );
};

export default Profile;
