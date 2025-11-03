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
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalSession, setModalSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeLeft(durationSeconds);
    setIsActive(false);
    setSessionsCompleted(0);
    setShowModal(false);
    setModalSession(null);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    if (timeLeft === 0) {
      setIsActive(false);
      setSessionsCompleted((prev) => {
        const next = prev + 1;
        setModalSession(next);
        setShowModal(true);
        return next;
      });
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const progressPercent = useMemo(() => {
    const elapsed = durationSeconds - timeLeft;
    const percentage = (elapsed / durationSeconds) * 100;
    return Math.min(Math.max(percentage, 8), 92);
  }, [durationSeconds, timeLeft]);

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsActive(true);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(durationSeconds);
    setShowModal(false);
  };

  const handleModalRestart = () => {
    setTimeLeft(durationSeconds);
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

      {sessionsCompleted > 0 && (
        <div className="timer-page__success">
          {successPrefix} #{sessionsCompleted} complete!
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
