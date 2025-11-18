import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
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

  const todayKey = getTodayKey();

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
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Failed to save tasks', error);
        setTasksError('Failed to save tasks. Try again.');
      }
    },
    [todayKey, todayTaskDocRef]
  );

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
                      {task.completed ? 'Done' : 'Pending'}
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
    </div>
  );
};

export default Wishlist;
