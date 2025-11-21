import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const FocusRecord = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
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
          return {
            id: docSnap.id,
            number: snapshot.docs.length - index,
            activityType: data.activityType || '—',
            activityDescription: data.activityDescription || '—',
            date: startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
            range: `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          };
        });
        setSessions(mapped);
      },
      () => setSessions([])
    );
    return () => unsub();
  }, [user]);

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
    </div>
  );
};

export default FocusRecord;
