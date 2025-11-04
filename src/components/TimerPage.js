import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as WalkerIcon } from '../assets/walker.svg';
import { ReactComponent as FlagIcon } from '../assets/flag.svg';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TimerPage = ({
  durationSeconds = 30 * 60,
  title = 'Main Chain',
  successPrefix = 'Session',
  storageKey,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalSession, setModalSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeLeft(durationSeconds);
    setIsActive(false);
    setShowModal(false);
    setModalSession(null);
    setSessionStart(null);
  }, [durationSeconds]);

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
    if (!isActive) {
      return undefined;
    }

    if (timeLeft === 0) {
      setIsActive(false);
      const endDate = new Date();
      const startDate = sessionStart ? new Date(sessionStart) : new Date(endDate.getTime() - durationSeconds * 1000);
      const formattedDate = startDate.toLocaleDateString('en-CA');
      const formattedStart = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedEnd = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setSessions((prev) => {
        const updatedSessions = [
          ...prev,
          {
            number: prev.length + 1,
            date: formattedDate,
            startTime: formattedStart,
            endTime: formattedEnd,
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
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionStart, durationSeconds, storageKey]);

  const progressPercent = useMemo(() => {
    const elapsed = durationSeconds - timeLeft;
    const percentage = (elapsed / durationSeconds) * 100;
    return Math.min(Math.max(percentage, 8), 92);
  }, [durationSeconds, timeLeft]);

  const handleStart = () => {
    if (timeLeft > 0) {
      if (!isActive) {
        setSessionStart(new Date());
      }
      setIsActive(true);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(durationSeconds);
    setShowModal(false);
    setSessionStart(null);
  };

  const handleModalRestart = () => {
    setTimeLeft(durationSeconds);
    setSessionStart(new Date());
    setIsActive(true);
    setShowModal(false);
  };

  const handleReturnToStudyRoom = () => {
    setShowModal(false);
    navigate('/');
  };

  return (
    <div className="timer-page">
      <h1 className="timer-page__title">{title}</h1>
      <div className="timer-display">{formatTime(timeLeft)}</div>

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

      <div className="controls controls--timer">
        <button type="button" onClick={handleStart} disabled={isActive || timeLeft === 0}>
          Start
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>

      {storageKey && sessions.length > 0 && (
        <div className="session-history">
          <h3 className="session-history__title">✅ Completed Sessions</h3>
          <div className="session-history__table">
            <div className="session-history__row session-history__row--head">
              <span>#</span>
              <span>Date</span>
              <span>Start</span>
              <span>End</span>
            </div>
            {sessions.map((session) => (
              <div className="session-history__row" key={`${session.number}-${session.date}-${session.startTime}`}>
                <span>{session.number}</span>
                <span>{session.date}</span>
                <span>{session.startTime}</span>
                <span>{session.endTime}</span>
              </div>
            ))}
          </div>
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
                Start Another Session
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
    </div>
  );
};

export default TimerPage;
