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
import './Wishlist.css';

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
  // Create a date object treating the input as local time components
  // This avoids UTC conversion issues that cause off-by-one errors
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
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
            const completedCount = taskList.filter((task) => task.completed).length;
            const totalCount = taskList.length;
            const percent = hasTasks
              ? Math.round((completedCount / totalCount) * 100)
              : 0;
            return {
              id: docSnap.id,
              date: dateValue,
              percent,
              completedCount,
              totalCount,
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
        createdAt: new Date().toISOString(),
      },
    ];
    setTasks(nextTasks);
    setNewTask('');
    persistTasks(nextTasks);
  };

  // Rollover Logic
  useEffect(() => {
    if (!user || !tasksCollectionRef || !todayTaskDocRef) return;

    const checkAndPerformRollover = async () => {
      try {
        // Check if today's document already exists
        const todayDocSnap = await import('firebase/firestore').then(mod => mod.getDoc(todayTaskDocRef));

        if (todayDocSnap.exists()) {
          return; // Today already started
        }

        // Find the most recent previous day
        const q = query(tasksCollectionRef, orderBy('date', 'desc'), limit(1));
        const querySnapshot = await import('firebase/firestore').then(mod => mod.getDocs(q));

        if (!querySnapshot.empty) {
          const lastDoc = querySnapshot.docs[0];
          const lastDate = lastDoc.data().date;

          // Ensure we aren't looking at today (though if today didn't exist, this should be past)
          if (lastDate !== todayKey) {
            const lastTasks = lastDoc.data().tasks || [];
            const incompleteTasks = lastTasks.filter(t => !t.completed);

            if (incompleteTasks.length > 0) {
              // Carry them over!
              // If they don't have a createdAt, assign the lastDate as a fallback
              const carriedOverTasks = incompleteTasks.map(t => ({
                ...t,
                createdAt: t.createdAt || new Date(lastDate).toISOString()
              }));

              await setDoc(todayTaskDocRef, {
                tasks: carriedOverTasks,
                date: todayKey,
                timeZone,
                updatedAt: serverTimestamp(),
              });
              // We don't need to manually set state here, the snapshot listener will pick it up
            }
          }
        }
      } catch (error) {
        console.warn("Error performing task rollover:", error);
      }
    };

    checkAndPerformRollover();
  }, [user, tasksCollectionRef, todayTaskDocRef, todayKey, timeZone]);

  const getTaskAge = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    // Reset times to midnight for accurate day difference
    created.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleToggleTask = async (taskId) => {
    const nextTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(nextTasks);
    persistTasks(nextTasks);
  };

  const handleRemoveTask = async (taskId) => {
    const nextTasks = tasks.filter((task) => task.id !== taskId);
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
                tasks.map((task) => {
                  const daysOld = getTaskAge(task.createdAt);
                  const isStale = !task.completed && daysOld > 0;

                  return (
                    <li
                      key={task.id}
                      className={`${task.completed ? 'completed' : ''} ${isStale ? 'wishlist-task-item--stale' : ''}`}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                        />
                        <div className="wishlist-task-content">
                          <span>{task.text}</span>
                          {isStale && (
                            <span className="wishlist-task-age">
                              {daysOld} day{daysOld > 1 ? 's' : ''} old
                            </span>
                          )}
                        </div>
                      </label>
                      <span className="wishlist-task-status">
                        {task.completed ? 'Completed' : 'Pending'}
                      </span>
                      <button
                        className="wishlist-task-remove"
                        onClick={() => handleRemoveTask(task.id)}
                        title="Remove task"
                      >
                        ×
                      </button>
                    </li>
                  );
                })
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
          <small>Resets every day at 23:59.</small>
        </div>
      </section>

      <section className="wishlist-section wishlist-section--history">
        <header>
          <h2>Daily Tasks Completion History</h2>
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
                        className={`wishlist-history-progress__fill${entry.hasTasks ? '' : ' wishlist-history-progress__fill--empty'
                          }`}
                        style={{ width: entry.hasTasks ? `${entry.percent}%` : '100%' }}
                      />
                    </div>
                    <span className="wishlist-history-label">
                      {entry.hasTasks
                        ? `${entry.percent}% completed (${entry.completedCount}/${entry.totalCount})`
                        : 'No tasks added'}
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
