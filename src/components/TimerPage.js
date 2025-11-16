import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as WalkerIcon } from '../assets/person.svg';
import { ReactComponent as FlagIcon } from '../assets/flag.svg';
import { AUTO_START_MAIN_KEY, DEFAULT_TASK_CATEGORY, TASK_CATEGORY_OPTIONS } from '../constants';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const breakdownDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};

const describeDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  }
  if (secs > 0) {
    parts.push(`${secs} second${secs === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) {
    return 'a moment';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return parts.join(' and ');
};

const TimerPage = ({
  durationSeconds = 30 * 60,
  title = 'Main Chain',
  successPrefix = 'Session',
  storageKey,
  intentStorageKey,
  durationPreferenceKey,
  isAuxiliary = false,
}) => {
  const initialBreakdown = breakdownDuration(durationSeconds);
  const [baseDuration, setBaseDuration] = useState(durationSeconds);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalSession, setModalSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [intentDetails, setIntentDetails] = useState(null);
  const [customHours, setCustomHours] = useState(initialBreakdown.hours.toString());
  const [customMinutes, setCustomMinutes] = useState(initialBreakdown.minutes.toString());
  const [customSeconds, setCustomSeconds] = useState(initialBreakdown.seconds.toString());
  const [durationError, setDurationError] = useState('');
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_TASK_CATEGORY);
  const [customCategory, setCustomCategory] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [showFocusFailPrompt, setShowFocusFailPrompt] = useState(false);
  const [graceSeconds, setGraceSeconds] = useState(null);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const auxiliaryWindowLabel = useMemo(() => describeDuration(baseDuration), [baseDuration]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    let initialDuration = durationSeconds;
    if (typeof window !== 'undefined' && durationPreferenceKey) {
      const storedDuration = Number(localStorage.getItem(durationPreferenceKey));
      if (!Number.isNaN(storedDuration) && storedDuration > 0) {
        initialDuration = storedDuration;
      }
    }
    setBaseDuration(initialDuration);
    setTimeLeft(initialDuration);
    setIsActive(false);
    setShowModal(false);
    setModalSession(null);
    setSessionStart(null);
    const { hours, minutes, seconds } = breakdownDuration(initialDuration);
    setCustomHours(hours.toString());
    setCustomMinutes(minutes.toString());
    setCustomSeconds(seconds.toString());
    setDurationError('');
  }, [durationSeconds, durationPreferenceKey]);

  useEffect(() => {
    if (!intentStorageKey || typeof window === 'undefined') {
      setIntentDetails(null);
      return;
    }
    try {
      const storedIntent = localStorage.getItem(intentStorageKey);
      if (!storedIntent) {
        setIntentDetails(null);
        return;
      }
      const parsedIntent = JSON.parse(storedIntent);
      if (parsedIntent && typeof parsedIntent === 'object') {
        setIntentDetails(parsedIntent);
      } else {
        setIntentDetails(null);
      }
    } catch (error) {
      console.warn('Failed to parse sacred seat intent', error);
      setIntentDetails(null);
    }
  }, [intentStorageKey]);

  useEffect(() => {
    if (!uid) {
      setSessions([]);
      return undefined;
    }
    const colName = isAuxiliary ? 'auxSessions' : 'mainSessions';
    const q = query(collection(db, 'users', uid, colName), orderBy('startTimestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const total = snapshot.docs.length;
        const mapped = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data();
          const startStamp = data.startTimestamp;
          const endStamp = data.endTimestamp;
          const startDate = startStamp?.toDate ? startStamp.toDate() : new Date(startStamp || Date.now());
          const endDate = endStamp?.toDate ? endStamp.toDate() : new Date(endStamp || Date.now());
          return {
            id: docSnap.id,
            number: total - index,
            chainNumber: total - index,
            date: startDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            activityType: data.activityType,
            activityDescription: data.activityDescription,
          };
        });
        setSessions(mapped);
      },
      (error) => {
        console.warn('Failed to subscribe to sessions', error);
        setSessions([]);
      }
    );
    return () => unsubscribe();
  }, [uid, isAuxiliary]);

  const finalizeSession = useCallback(
    async ({ endDate = new Date(), silent = false } = {}) => {
      if (!uid) {
        return;
      }
      const startDate = sessionStart ? new Date(sessionStart) : new Date(endDate.getTime() - baseDuration * 1000);
      const activityType = intentDetails?.categoryLabel || 'Focus Session';
      const activityDescription = intentDetails?.description || '';
      const colName = isAuxiliary ? 'auxSessions' : 'mainSessions';

      try {
        await addDoc(collection(db, 'users', uid, colName), {
          startTimestamp: startDate,
          endTimestamp: endDate,
          ...(isAuxiliary
            ? {}
            : {
                activityType,
                activityDescription,
              }),
          createdAt: new Date(),
        });
        if (!silent && !isAuxiliary) {
          const nextNumber = sessions.length > 0 ? sessions[0].number + 1 : 1;
          setModalSession(nextNumber);
        }
      } catch (error) {
      console.warn('Failed to persist session', error);
    }
  },
  [uid, sessionStart, baseDuration, intentDetails, isAuxiliary, sessions]
);

  const clearSessions = useCallback(async () => {
    if (!uid) {
      setSessions([]);
      return;
    }
    const colName = isAuxiliary ? 'auxSessions' : 'mainSessions';
    try {
      const colRef = collection(db, 'users', uid, colName);
      const snap = await getDocs(colRef);
      await Promise.all(snap.docs.map((docSnap) => deleteDoc(doc(db, 'users', uid, colName, docSnap.id))));
    } catch (error) {
      console.warn('Failed to clear sessions', error);
    }
  }, [uid, isAuxiliary]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    if (timeLeft === 0) {
      setIsActive(false);
      finalizeSession({ silent: isAuxiliary });
      if (isAuxiliary) {
        setGraceSeconds(5);
        setShowModal(false);
      } else {
        setShowModal(true);
      }
      setSessionStart(null);
      setShowFocusFailPrompt(false);
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, finalizeSession, isAuxiliary]);

  const handleGraceExpired = useCallback(async () => {
    setGraceSeconds(null);
    setTimeLeft(baseDuration);
    setShowModal(false);
    await clearSessions();
  }, [baseDuration, clearSessions]);

  useEffect(() => {
    if (!isAuxiliary || graceSeconds === null) {
      return undefined;
    }
    if (graceSeconds === 0) {
      handleGraceExpired();
      return undefined;
    }
    const countdown = setTimeout(() => {
      setGraceSeconds((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearTimeout(countdown);
  }, [graceSeconds, isAuxiliary, handleGraceExpired]);

  const progressPercent = useMemo(() => {
    if (baseDuration === 0) {
      return 0;
    }
    const elapsed = baseDuration - timeLeft;
    const percentage = (elapsed / baseDuration) * 100;
    return Math.min(Math.max(percentage, 8), 92);
  }, [baseDuration, timeLeft]);

  const beginSession = useCallback(() => {
    setSessionStart(new Date());
    setIsActive(true);
    setGraceSeconds(null);
  }, []);

  const handleStart = () => {
    if (timeLeft > 0 && !isActive) {
      setGraceSeconds(null);
      if (intentStorageKey) {
        openIntentModal();
        return;
      }
      beginSession();
    }
  };

  const handleModalRestart = () => {
    setTimeLeft(baseDuration);
    beginSession();
    setShowModal(false);
  };

  const handleReturnToStudyRoom = () => {
    setShowModal(false);
    navigate('/');
  };

  useEffect(() => {
    if (isAuxiliary || typeof window === 'undefined') {
      return;
    }
    const autoStart = localStorage.getItem(AUTO_START_MAIN_KEY);
    if (autoStart === '1' && !isActive && timeLeft > 0) {
      localStorage.removeItem(AUTO_START_MAIN_KEY);
      beginSession();
    }
  }, [isAuxiliary, isActive, timeLeft, beginSession]);

  const handleImmediateStart = useCallback(() => {
    if (isActive) {
      finalizeSession({ silent: true });
    }
    setIsActive(false);
    setTimeLeft(baseDuration);
    setSessionStart(null);
    setShowFocusFailPrompt(false);
    setGraceSeconds(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTO_START_MAIN_KEY, '1');
      } catch (error) {
        console.warn('Failed to schedule auto start', error);
      }
    }
    navigate('/timer');
  }, [isActive, finalizeSession, baseDuration, navigate]);

  const handleCancelReservation = () => {
    setShowCancelPrompt(true);
  };

  const handleCancelReservationConfirm = async () => {
    setShowCancelPrompt(false);
    setIsActive(false);
    setTimeLeft(baseDuration);
    setSessionStart(null);
    setGraceSeconds(null);
    setShowModal(false);
    setShowFocusFailPrompt(false);
    await clearSessions();
  };

  const handleCancelReservationClose = () => {
    setShowCancelPrompt(false);
  };

  const handleFocusFailInitiate = () => {
    if (!storageKey) {
      return;
    }
    setShowFocusFailPrompt(true);
  };

  const handleFocusFailCancel = () => {
    setShowFocusFailPrompt(false);
  };

  const handleFocusFailConfirm = async () => {
    await clearSessions();
    setIsActive(false);
    setTimeLeft(baseDuration);
    setSessionStart(null);
    setShowModal(false);
    setShowFocusFailPrompt(false);
  };

  const requiresCustomCategory = selectedCategory === 'custom';

  const resolvedCategoryLabel = useMemo(() => {
    if (!requiresCustomCategory) {
      return (
        TASK_CATEGORY_OPTIONS.find((option) => option.value === selectedCategory)?.label ?? selectedCategory
      );
    }
    const trimmed = customCategory.trim();
    return trimmed.length > 0 ? trimmed : 'Custom';
  }, [selectedCategory, customCategory, requiresCustomCategory]);

  const logEntries = useMemo(() => {
    if (!sessions?.length) {
      return [];
    }
    return sessions;
  }, [sessions]);

  const openIntentModal = () => {
    if (intentDetails) {
      setSelectedCategory(intentDetails.categoryValue ?? DEFAULT_TASK_CATEGORY);
      if ((intentDetails.categoryValue ?? '') === 'custom') {
        setCustomCategory(intentDetails.categoryLabel ?? '');
      } else {
        setCustomCategory('');
      }
      setDescriptionInput(intentDetails.description ?? '');
    } else {
      setSelectedCategory(DEFAULT_TASK_CATEGORY);
      setCustomCategory('');
      setDescriptionInput('');
    }
    setIsIntentModalOpen(true);
  };

  const resetIntentModalState = () => {
    setIsIntentModalOpen(false);
  };

  const handleIntentModalStart = () => {
    if (requiresCustomCategory && customCategory.trim().length === 0) {
      return;
    }
    const intent = {
      categoryLabel: resolvedCategoryLabel,
      categoryValue: selectedCategory,
      description: descriptionInput.trim(),
      startTime: new Date().toISOString(),
    };

    setIntentDetails(intent);
    if (intentStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(intentStorageKey, JSON.stringify(intent));
      } catch (error) {
        console.warn('Failed to persist session intent', error);
      }
    }
    beginSession();
    setIsIntentModalOpen(false);
  };


  const openDurationModal = () => {
    if (!isActive) {
      setShowDurationModal(true);
    }
  };

  const closeDurationModal = () => {
    setShowDurationModal(false);
    setDurationError('');
  };

  const handleDurationSubmit = (event) => {
    event.preventDefault();
    const hoursValue = Number(customHours);
    const minutesValue = Number(customMinutes);
    const secondsValue = Number(customSeconds);
    if (
      Number.isNaN(hoursValue) ||
      Number.isNaN(minutesValue) ||
      Number.isNaN(secondsValue) ||
      hoursValue < 0 ||
      minutesValue < 0 ||
      minutesValue >= 60 ||
      secondsValue < 0 ||
      secondsValue >= 60
    ) {
      setDurationError('Enter hours ≥ 0, minutes 0-59, and seconds 0-59.');
      return;
    }
    const totalDuration = hoursValue * 3600 + minutesValue * 60 + secondsValue;
    if (totalDuration <= 0) {
      setDurationError('Timer length must be greater than zero.');
      return;
    }

    const newDuration = Math.round(totalDuration);
    setBaseDuration(newDuration);
    setTimeLeft(newDuration);
    setIsActive(false);
    setShowModal(false);
    setSessionStart(null);
    setDurationError('');
    setShowDurationModal(false);

    if (typeof window !== 'undefined' && durationPreferenceKey) {
      try {
        localStorage.setItem(durationPreferenceKey, String(newDuration));
      } catch (error) {
        console.warn('Failed to persist custom duration', error);
      }
    }
  };

  const activeTitle = isActive && intentDetails?.categoryLabel ? intentDetails.categoryLabel : null;
  const activeSubtitle = isActive && intentDetails?.description ? intentDetails.description : null;

  return (
    <div className={`timer-page${isActive ? ' timer-page--active' : ''}`}>
      <h1 className={`timer-page__title${activeTitle ? ' timer-page__title--active' : ''}`}>
        {activeTitle || title}
      </h1>
      {activeSubtitle && <p className="timer-page__subtitle">{activeSubtitle}</p>}
      <div className="timer-display-wrapper">
        <div className="timer-display">{formatTime(timeLeft)}</div>
        {!isActive && (
          <button
            type="button"
            className="timer-display__action"
            onClick={openDurationModal}
          >
            Adjust Timer
          </button>
        )}
      </div>

      <div className="timer-progress">
        <div className="timer-progress__track">
          <span
            className="timer-progress__figure"
            style={{ left: `${progressPercent}%` }}
            role="img"
            aria-label="Focus traveler"
          >
            <WalkerIcon />
          </span>
          <span className="timer-progress__flag" role="img" aria-label="Goal flag">
            <FlagIcon />
          </span>
          <div className="timer-progress__line" />
        </div>
      </div>
      {!isActive && (
        <div className="controls controls--timer controls--primary">
          <button type="button" onClick={handleStart} disabled={timeLeft === 0}>
            Start
          </button>
        </div>
      )}
      {isIntentModalOpen && (
        <div
          className="sacred-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intent-modal-title"
        >
          <div className="sacred-modal">
            <h2 id="intent-modal-title" className="sacred-modal__title">
              What are you going to focus on?
            </h2>
            <label className="sacred-modal__label">
              Category
              <select
                className="sacred-modal__select"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {TASK_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {requiresCustomCategory && (
              <label className="sacred-modal__label">
                Custom category
                <input
                  type="text"
                  className="sacred-modal__input"
                  placeholder="e.g. Deep Work Sprint"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                />
              </label>
            )}
            <label className="sacred-modal__label">
              Description
              <textarea
                className="sacred-modal__textarea"
                placeholder="Describe the focus task"
                value={descriptionInput}
                onChange={(event) => setDescriptionInput(event.target.value)}
                rows={4}
              />
            </label>
            <div className="sacred-modal__actions">
              <p className="sacred-modal__warning">
                {isAuxiliary
                  ? `Once you start this timer, you must begin the main task within ${auxiliaryWindowLabel}. If you don't, all records will be erased.`
                  : 'Once you press Start Session, Sacred Seat protocol is in effect—stay fully focused for the entire timer or your record will be reset.'}
              </p>
              <button
                type="button"
                className="sacred-modal__secondary"
                onClick={resetIntentModalState}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sacred-modal__primary"
                onClick={handleIntentModalStart}
                disabled={requiresCustomCategory && customCategory.trim().length === 0}
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
      {storageKey && (
        <div className="timer-log">
          <h2 className="timer-log__title">{isAuxiliary ? 'Reservation Record' : 'Focus Record'}</h2>
          {logEntries.length === 0 ? (
            <p className="timer-log__empty">No sessions recorded yet. Stay focused to create your streak.</p>
          ) : (
            <div className="timer-log__entries">
              {logEntries.map((session) => (
                <div className="timer-log__entry" key={`${session.number}-${session.date}-${session.startTime}`}>
                  <div className="timer-log__meta">
                    {!isAuxiliary && (
                      <span className="timer-log__number">{session.number}</span>
                    )}
                    {!isAuxiliary && <span className="timer-log__date">{session.date}</span>}
                  </div>
                  <div className={`timer-log__details${isAuxiliary ? ' timer-log__details--full' : ''}`}>
                    {!isAuxiliary && (
                      <>
                        <div className="timer-log__activity">{session.activityType || 'Focus Session'}</div>
                        {session.activityDescription && (
                          <p className="timer-log__description">{session.activityDescription}</p>
                        )}
                      </>
                    )}
                    {isAuxiliary && (
                      <div className="timer-log__activity">Successful Reservation #{session.chainNumber || session.number}</div>
                    )}
                  </div>
                  <div className="timer-log__time">
                    {session.startTime} - {session.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {showDurationModal && (
        <div
          className="sacred-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timer-settings-title"
        >
          <div className="sacred-modal">
            <h2 id="timer-settings-title" className="sacred-modal__title">
              Customize Timer Length
            </h2>
            <form className="timer-settings" onSubmit={handleDurationSubmit}>
              <div className="timer-settings__inputs">
                <label className="timer-settings__label">
                  Hours
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="timer-settings__input"
                    value={customHours}
                    onChange={(event) => {
                      setCustomHours(event.target.value);
                      setDurationError('');
                    }}
                  />
                </label>
                <label className="timer-settings__label">
                  Minutes
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    className="timer-settings__input"
                    value={customMinutes}
                    onChange={(event) => {
                      setCustomMinutes(event.target.value);
                      setDurationError('');
                    }}
                  />
                </label>
                <label className="timer-settings__label">
                  Seconds
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    className="timer-settings__input"
                    value={customSeconds}
                    onChange={(event) => {
                      setCustomSeconds(event.target.value);
                      setDurationError('');
                    }}
                  />
                </label>
              </div>
              <p className="timer-settings__hint">
                Currently set to {formatTime(baseDuration)}
              </p>
              {durationError && <p className="timer-settings__error">{durationError}</p>}
              <div className="timer-settings__actions">
                <button type="button" className="timer-settings__cancel" onClick={closeDurationModal}>
                  Cancel
                </button>
                <button type="submit" className="timer-settings__apply">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isActive && (
        <div className="controls controls--timer controls--secondary">
          {isAuxiliary ? (
            <>
              <button
                type="button"
                className="controls__start-task"
                onClick={handleImmediateStart}
              >
                Start Task Now
              </button>
              <button
                type="button"
                className="controls__cancel"
                onClick={handleCancelReservation}
              >
                Cancel Reservation
              </button>
            </>
          ) : (
            storageKey && (
              <button
                type="button"
                className="controls__fail"
                onClick={handleFocusFailInitiate}
              >
                I lost focus
              </button>
            )
          )}
        </div>
      )}

      {showModal && (
        <div className="timer-modal__overlay" role="dialog" aria-modal="true">
          <div className="timer-modal">
            <h2 className="timer-modal__title">
              🎉 Congratulations! {successPrefix} #{modalSession} Complete!
            </h2>
            <p className="timer-modal__subtitle">
              You crushed that focus block. Ready to keep the momentum going?
            </p>
            <div className="timer-modal__actions">
              <button
                type="button"
                className="timer-modal__primary"
                onClick={handleModalRestart}
              >
                Continue Same Task
              </button>
              <button
                type="button"
                className="timer-modal__secondary"
                onClick={handleReturnToStudyRoom}
              >
                Return to Study Room
              </button>
            </div>
          </div>
        </div>
      )}
      {isAuxiliary && graceSeconds !== null && (
        <div className="timer-modal__overlay" role="dialog" aria-modal="true">
          <div className="timer-modal timer-modal--warning">
            <h2 className="timer-modal__title">Time to LOCK IN</h2>
            <p className="timer-modal__subtitle">
              Start your main task now. Records reset in {graceSeconds}s if you don't continue.
            </p>
            <div className="timer-modal__actions">
              <button
                type="button"
                className="timer-modal__primary"
                onClick={handleImmediateStart}
              >
                Start Task Now
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelPrompt && (
        <div className="timer-modal__overlay" role="dialog" aria-modal="true">
          <div className="timer-modal timer-modal--warning">
            <h2 className="timer-modal__title">Cancel Reservation?</h2>
            <p className="timer-modal__subtitle">
              Are you sure you want to cancel this reservation? All records will be erased if you do so.
            </p>
            <div className="timer-modal__actions">
              <button
                type="button"
                className="timer-modal__secondary"
                onClick={handleCancelReservationClose}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="timer-modal__danger"
                onClick={handleCancelReservationConfirm}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showFocusFailPrompt && (
        <div className="timer-modal__overlay" role="dialog" aria-modal="true">
          <div className="timer-modal timer-modal--warning">
            <h2 className="timer-modal__title">⚠️ Reset Streak?</h2>
            <p className="timer-modal__subtitle">
              This will erase every recorded session and restart your streak. Only proceed if this block
              truly failed.
            </p>
            <div className="timer-modal__actions">
              <button
                type="button"
                className="timer-modal__secondary"
                onClick={handleFocusFailCancel}
              >
                Keep Streak
              </button>
              <button
                type="button"
                className="timer-modal__danger"
                onClick={handleFocusFailConfirm}
              >
                Yes, reset everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerPage;
