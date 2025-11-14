import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as WalkerIcon } from '../assets/walker.svg';
import { ReactComponent as FlagIcon } from '../assets/flag.svg';
import { DEFAULT_TASK_CATEGORY, TASK_CATEGORY_OPTIONS } from '../constants';

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

const TimerPage = ({
  durationSeconds = 30 * 60,
  title = 'Main Chain',
  successPrefix = 'Session',
  storageKey,
  intentStorageKey,
  durationPreferenceKey,
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
  const [showDurationModal, setShowDurationModal] = useState(false);
  const navigate = useNavigate();

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
    if (!storageKey || typeof window === 'undefined') {
      setSessions([]);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(stored)) {
        setSessions(stored);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.warn('Failed to parse stored sessions', error);
      setSessions([]);
    }
  }, [storageKey]);

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
    if (!isActive) {
      return undefined;
    }

    if (timeLeft === 0) {
      setIsActive(false);
      const endDate = new Date();
      const startDate = sessionStart ? new Date(sessionStart) : new Date(endDate.getTime() - baseDuration * 1000);
      const formattedDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const formattedStart = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedEnd = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const activityType = intentDetails?.categoryLabel || 'Focus Session';
      const activityDescription = intentDetails?.description || '';

      setSessions((prev) => {
        const updatedSessions = [
          ...prev,
          {
            number: prev.length + 1,
            date: formattedDate,
            startTime: formattedStart,
            endTime: formattedEnd,
            activityType,
            activityDescription,
          },
        ];

        if (storageKey && typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
          } catch (error) {
            console.warn('Failed to persist sessions', error);
          }
        }

        setModalSession(updatedSessions.length);
        return updatedSessions;
      });

      setShowModal(true);
      setSessionStart(null);
      setShowFocusFailPrompt(false);
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionStart, baseDuration, storageKey]);

  const progressPercent = useMemo(() => {
    if (baseDuration === 0) {
      return 0;
    }
    const elapsed = baseDuration - timeLeft;
    const percentage = (elapsed / baseDuration) * 100;
    return Math.min(Math.max(percentage, 8), 92);
  }, [baseDuration, timeLeft]);

  const handleStart = () => {
    if (timeLeft > 0 && !isActive) {
      if (intentStorageKey) {
        openIntentModal();
        return;
      }
      setSessionStart(new Date());
      setIsActive(true);
    }
  };

  const handleModalRestart = () => {
    setTimeLeft(baseDuration);
    setSessionStart(new Date());
    setIsActive(true);
    setShowModal(false);
  };

  const handleReturnToStudyRoom = () => {
    setShowModal(false);
    navigate('/');
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

  const handleFocusFailConfirm = () => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear sessions', error);
      }
    }
    setSessions([]);
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
    return [...sessions].reverse();
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
    setSessionStart(new Date());
    setIsActive(true);
    setIsIntentModalOpen(false);
  };


  const openDurationModal = () => {
    setShowDurationModal(true);
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

  return (
    <div className="timer-page">
      <h1 className="timer-page__title">{title}</h1>
      <div className="timer-display-wrapper">
        <div className="timer-display">{formatTime(timeLeft)}</div>
        <button
          type="button"
          className="timer-display__action"
          onClick={openDurationModal}
        >
          Adjust Timer
        </button>
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
      <div className="controls controls--timer controls--primary">
        <button type="button" onClick={handleStart} disabled={isActive || timeLeft === 0}>
          Start
        </button>
      </div>
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
                Once you press Start Session, Sacred Seat protocol is in effect—stay fully focused for the entire timer or your record will be reset.
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
          <h2 className="timer-log__title">Focus Record</h2>
          {logEntries.length === 0 ? (
            <p className="timer-log__empty">No sessions recorded yet. Stay focused to create your streak.</p>
          ) : (
            <div className="timer-log__entries">
              {logEntries.map((session) => (
                <div className="timer-log__entry" key={`${session.number}-${session.date}-${session.startTime}`}>
                  <div className="timer-log__meta">
                    <span className="timer-log__number">#{session.number}</span>
                    <span className="timer-log__date">{session.date}</span>
                  </div>
                  <div className="timer-log__details">
                    <div className="timer-log__activity">{session.activityType || 'Focus Session'}</div>
                    {session.activityDescription && (
                      <p className="timer-log__description">{session.activityDescription}</p>
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
      {intentDetails && (
        <div className="timer-intent">
          <div className="timer-intent__category">{intentDetails.categoryLabel}</div>
          {intentDetails.description && (
            <p className="timer-intent__description">{intentDetails.description}</p>
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

      {storageKey && isActive && (
        <div className="controls controls--timer controls--secondary">
          <button
            type="button"
            className="controls__fail"
            onClick={handleFocusFailInitiate}
          >
            I lost focus
          </button>
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
