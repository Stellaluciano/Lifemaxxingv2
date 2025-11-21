import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const DEFAULT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const formatDateKey = (date, timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
};

const formatDisplayDate = (key, timeZone) => {
  const [year, month, day] = key.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat([], {
    timeZone: timeZone || 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(utcDate);
};

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const Wishlist = () => {
  const { user } = useAuth();
  const [directions, setDirections] = useState([]);
  const [newDirection, setNewDirection] = useState('');
  const [addingDirection, setAddingDirection] = useState(false);
  const [directionError, setDirectionError] = useState('');

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [newTask, setNewTask] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);

  const todayKey = useMemo(() => formatDateKey(new Date(), timeZone), [timeZone]);

  const directionsCollectionRef = useMemo(() => {
    if (!user) {
      return null;
    }
    return collection(db, 'users', user.uid, 'lifeDirections');
  }, [user]);

  const todayTaskDocRef = useMemo(() => {
    if (!user) {
      return null;
    }
    return doc(db, 'users', user.uid, 'dailyTasks', todayKey);
  }, [user, todayKey]);

  const tasksCollectionRef = useMemo(() => {
    if (!user) {
      return null;
    }
    return collection(db, 'users', user.uid, 'dailyTasks');
  }, [user]);

  const profileDocRef = useMemo(() => {
    if (!user) {
      return null;
    }
    return doc(db, 'users', user.uid, 'profile', 'details');
  }, [user]);

  const persistTasks = useCallback(
    async (nextTasks) => {
      if (!todayTaskDocRef) {
        return;
      }
      try {
        await setDoc(
          todayTaskDocRef,
          {
            tasks: nextTasks,
            date: todayKey,
            timeZone,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Failed to save tasks', error);
        setTasksError('Failed to save tasks. Try again.');
      }
    },
    [todayKey, timeZone, todayTaskDocRef]
  );

  useEffect(() => {
    if (!profileDocRef) {
      setTimeZone(DEFAULT_TIME_ZONE);
      return undefined;
    }
    const unsub = onSnapshot(
      profileDocRef,
      (snapshot) => {
        const data = snapshot.data();
        setTimeZone(data?.timeZone || DEFAULT_TIME_ZONE);
      },
      (error) => {
        console.warn('Failed to load profile for timezone', error);
        setTimeZone(DEFAULT_TIME_ZONE);
      }
    );
    return () => unsub();
  }, [profileDocRef]);

  useEffect(() => {
    if (!directionsCollectionRef) {
      setDirections([]);
      return undefined;
    }
    const q = query(directionsCollectionRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          text: docSnap.data().text,
          createdAt: docSnap.data().createdAt?.toDate?.() ?? null,
        }));
        setDirections(list);
      },
      (error) => {
        console.warn('Failed to load life directions', error);
        setDirections([]);
        setDirectionError('Unable to load your life directions.');
      }
    );
    return () => unsub();
  }, [directionsCollectionRef]);

  useEffect(() => {
    if (!todayTaskDocRef) {
      setTasks([]);
      return undefined;
    }
    setTasksLoading(true);
    const unsub = onSnapshot(
      todayTaskDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTasks(data.tasks || []);
        } else {
          setTasks([]);
        }
        setTasksLoading(false);
        setTasksError('');
      },
      (error) => {
        console.warn('Failed to load tasks', error);
        setTasks([]);
        setTasksLoading(false);
        setTasksError('Unable to load today’s tasks.');
      }
    );
    return () => unsub();
  }, [todayTaskDocRef]);

  useEffect(() => {
    if (!tasksCollectionRef) {
      setHistory([]);
      return undefined;
    }
    setHistoryLoading(true);
    const q = query(tasksCollectionRef, orderBy('date', 'desc'), limit(14));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const dateValue = data.date || docSnap.id;
            const taskList = Array.isArray(data.tasks) ? data.tasks : [];
            const hasTasks = taskList.length > 0;
            const percent = hasTasks
              ? Math.round((taskList.filter((task) => task.completed).length / taskList.length) * 100)
              : 0;
            return {
              id: docSnap.id,
              date: dateValue,
              percent,
              hasTasks,
              timeZone: data.timeZone || DEFAULT_TIME_ZONE,
            };
          })
          .filter((entry) => entry.date !== todayKey);
        setHistory(entries);
        setHistoryLoading(false);
        setHistoryError('');
      },
      (error) => {
        console.warn('Failed to load history', error);
        setHistory([]);
        setHistoryLoading(false);
        setHistoryError('Unable to load completion history.');
      }
    );
    return () => unsub();
  }, [tasksCollectionRef, todayKey]);

  const handleAddDirection = async (event) => {
    event.preventDefault();
    if (!directionsCollectionRef || !newDirection.trim()) {
      return;
    }
    setAddingDirection(true);
    setDirectionError('');
    try {
      await addDoc(directionsCollectionRef, {
        text: newDirection.trim(),
        createdAt: serverTimestamp(),
      });
      setNewDirection('');
    } catch (error) {
      console.warn('Failed to add life direction', error);
      setDirectionError('Could not add life direction.');
    } finally {
      setAddingDirection(false);
    }
  };

  const handleAddTask = async (event) => {
    event.preventDefault();
    if (!newTask.trim()) {
      return;
    }
    const nextTasks = [
      ...tasks,
      {
        id: createId(),
        text: newTask.trim(),
        completed: false,
      },
    ];
    setTasks(nextTasks);
    setNewTask('');
    persistTasks(nextTasks);
  };

  const handleToggleTask = async (taskId) => {
    const nextTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(nextTasks);
    persistTasks(nextTasks);
  };

  const completionPercent = useMemo(() => {
    if (tasks.length === 0) {
      return 0;
    }
    const completed = tasks.filter((task) => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const circleRadius = 70;
  const circumference = 2 * Math.PI * circleRadius;
  const progressOffset = circumference - (completionPercent / 100) * circumference;

  if (!user) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-card">
          <p>Please log in to manage your intentions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <section className="wishlist-section wishlist-section--directions">
        <header>
          <h1>Life Direction Keywords</h1>
          <p>Capture the phrases that keep you grounded. They become part of your history.</p>
        </header>
        <form className="wishlist-direction-form" onSubmit={handleAddDirection}>
          <input
            type="text"
            placeholder="Add a guiding phrase..."
            value={newDirection}
            onChange={(event) => setNewDirection(event.target.value)}
          />
          <button type="submit" disabled={addingDirection}>
            {addingDirection ? 'Adding...' : 'Add'}
          </button>
        </form>
        {directionError && <div className="wishlist-error">{directionError}</div>}
        <div className="wishlist-direction-history">
          {directions.length === 0 ? (
            <p className="wishlist-empty">No life directions yet.</p>
          ) : (
            directions.map((direction) => (
              <div className="wishlist-direction-chip" key={direction.id}>
                <span>{direction.text}</span>
                {direction.createdAt && (
                  <small>
                    Added{' '}
                    {direction.createdAt.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </small>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="wishlist-section wishlist-section--tasks">
        <div className="wishlist-tasks-panel">
          <header>
            <h2>Today’s Tasks</h2>
            <p>Plan concrete actions for {todayKey} and mark them as you go.</p>
          </header>
          <form className="wishlist-task-form" onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Add a task for today"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
            />
            <button type="submit">Add Task</button>
          </form>
          {tasksError && <div className="wishlist-error">{tasksError}</div>}
          {tasksLoading ? (
            <div className="wishlist-loading">Loading tasks…</div>
          ) : (
            <ul className="wishlist-task-list">
              {tasks.length === 0 ? (
                <li className="wishlist-empty">No tasks set for today.</li>
              ) : (
                tasks.map((task) => (
                  <li key={task.id} className={task.completed ? 'completed' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                      />
                      <span>{task.text}</span>
                    </label>
                    <span className="wishlist-task-status">
                      {task.completed ? 'Completed' : 'Pending'}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <div className="wishlist-progress-panel">
          <h3>Daily Completion</h3>
          <p>{completionPercent}% of tasks completed today.</p>
          <div className="wishlist-progress-chart">
            <svg width="180" height="180">
              <circle
                className="wishlist-progress-track"
                cx="90"
                cy="90"
                r={circleRadius}
                strokeWidth="14"
              />
              <circle
                className="wishlist-progress-indicator"
                cx="90"
                cy="90"
                r={circleRadius}
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
              />
              <text x="90" y="95" textAnchor="middle" className="wishlist-progress-text">
                {completionPercent}%
              </text>
            </svg>
          </div>
          <small>Pie chart resets every day at 23:59.</small>
        </div>
      </section>

      <section className="wishlist-section wishlist-section--history">
        <header>
          <h2>Daily Completion History</h2>
          <p>Track how consistently you execute on your intentions.</p>
        </header>
        {historyError && <div className="wishlist-error">{historyError}</div>}
        {historyLoading ? (
          <div className="wishlist-loading">Loading history…</div>
        ) : history.length === 0 ? (
          <p className="wishlist-empty">No history recorded yet.</p>
        ) : (
          <ul className="wishlist-history-list">
            {history.map((entry) => {
              const formattedDate = entry.date
                ? formatDisplayDate(entry.date, entry.timeZone)
                : entry.id;
              return (
                <li
                  key={entry.id}
                  className={`wishlist-history-item${entry.hasTasks ? '' : ' wishlist-history-item--empty'}`}
                >
                  <div className="wishlist-history-date">{formattedDate}</div>
                  <div className="wishlist-history-progress">
                    <div className="wishlist-history-progress__track">
                      <div
                        className={`wishlist-history-progress__fill${
                          entry.hasTasks ? '' : ' wishlist-history-progress__fill--empty'
                        }`}
                        style={{ width: entry.hasTasks ? `${entry.percent}%` : '100%' }}
                      />
                    </div>
                    <span className="wishlist-history-label">
                      {entry.hasTasks ? `${entry.percent}% completed` : 'No tasks added'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Wishlist;
