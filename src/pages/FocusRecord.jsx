import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ReactComponent as CrackedTrophyIcon } from '../assets/trophy-cracked.svg';
import './FocusRecord.css';

const FocusRecord = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [graveyardRecords, setGraveyardRecords] = useState([]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setGraveyardRecords([]);
      return undefined;
    }
    const q = query(collection(db, 'users', user.uid, 'mainSessions'), orderBy('startTimestamp', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data();
          const startStamp = data.startTimestamp;
          const endStamp = data.endTimestamp;
          const startDate = startStamp?.toDate ? startStamp.toDate() : new Date(startStamp || Date.now());
          const endDate = endStamp?.toDate ? endStamp.toDate() : new Date(endStamp || Date.now());

          // Explicitly format date parts to avoid timezone shifts if any
          const dateString = startDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return {
            id: docSnap.id,
            number: snapshot.docs.length - index,
            activityType: data.activityType || '—',
            activityDescription: data.activityDescription || '—',
            date: dateString,
            range: `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          };
        });
        setSessions(mapped);
      },
      () => setSessions([])
    );

    const graveyardQ = query(collection(db, 'users', user.uid, 'graveyard'), orderBy('timestamp', 'desc'));
    const graveyardUnsub = onSnapshot(
      graveyardQ,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setGraveyardRecords(mapped);
      },
      () => setGraveyardRecords([])
    );

    return () => {
      unsub();
      graveyardUnsub();
    };
  }, [user]);

  const clearGraveyard = async () => {
    if (!user) return;
    try {
      const colRef = collection(db, 'users', user.uid, 'graveyard');
      const snap = await getDocs(colRef);
      await Promise.all(snap.docs.map((docSnap) => deleteDoc(doc(db, 'users', user.uid, 'graveyard', docSnap.id))));
    } catch (error) {
      console.warn('Failed to clear graveyard', error);
    }
  };

  if (!user) {
    return (
      <div className="focus-record-page">
        <div className="focus-record-card">
          <h1>Focus Record</h1>
          <p>Please log in to view your sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-record-page">
      <div className="focus-record-card focus-record-card--stretch">
        <h1>Focus Record</h1>
        <table className="focus-record-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Task Type</th>
              <th>Description</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="5" className="focus-record-empty">
                  No sessions logged yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.number}</td>
                  <td>{session.activityType}</td>
                  <td>{session.activityDescription}</td>
                  <td>{session.date}</td>
                  <td>{session.range}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="focus-record-card focus-record-card--stretch" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Focus Graveyard</h2>
          {graveyardRecords.length > 0 && (
            <button onClick={clearGraveyard} className="graveyard-clear-btn">
              Clear Graveyard
            </button>
          )}
        </div>
        {graveyardRecords.length === 0 ? (
          <p className="focus-record-empty">No failed chains recorded.</p>
        ) : (
          <div className="graveyard-grid">
            {graveyardRecords.map((record) => (
              <div key={record.id} className="graveyard-item">
                <div className="graveyard-icon">
                  <CrackedTrophyIcon />
                </div>
                <span className="graveyard-count">{record.chainLength}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusRecord;
