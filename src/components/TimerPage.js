import React, { useEffect, useMemo, useState } from 'react';

const SESSION_DURATION = 30 * 60;

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TimerPage = () => {
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    if (timeLeft === 0) {
      setIsActive(false);
      setSessionsCompleted((prev) => prev + 1);
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const progressPercent = useMemo(() => {
    const elapsed = SESSION_DURATION - timeLeft;
    const percentage = (elapsed / SESSION_DURATION) * 100;
    return Math.min(Math.max(percentage, 4), 96);
  }, [timeLeft]);

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsActive(true);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(SESSION_DURATION);
  };

  return (
    <div className="timer-page">
      <h1 className="timer-page__title">Main Chain</h1>
      <div className="timer-display">{formatTime(timeLeft)}</div>

      <div className="timer-progress">
        <div className="timer-progress__track">
          <span
            className="timer-progress__figure"
            style={{ left: `${progressPercent}%` }}
            role="img"
            aria-label="Focus traveler"
          >
            🧍‍♂️
          </span>
          <span className="timer-progress__flag" role="img" aria-label="Goal flag">
            🚩
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
        <div className="timer-page__success">Session #{sessionsCompleted} complete!</div>
      )}
    </div>
  );
};

export default TimerPage;
