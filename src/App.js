import React, { useState, useEffect } from 'react';
import './App.css';
import './firebase';

function App() {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isActive, setIsActive] = useState(false);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      alert('⏰ Sacred Seat complete!');
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsActive(true);
    }
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(30 * 60);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Lifemaxxing ⏳</h1>
        <h2>{formatTime(timeLeft)}</h2>
        <div>
          <button onClick={handleStart} disabled={isActive || timeLeft === 0}>
            Start
          </button>
          <button onClick={handlePause} disabled={!isActive}>
            Pause
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </header>
    </div>
  );
}

export default App;
