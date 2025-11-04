import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import StudyRoom from './components/StudyRoom';
import TimerPage from './components/TimerPage';
import RsipComingSoon from './pages/RsipComingSoon';
import CorePrinciples from './pages/CorePrinciples';
import './App.css';
import './firebase';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<StudyRoom />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route
            path="/auxiliary-timer"
            element={
              <TimerPage
                durationSeconds={15 * 60}
                title="Auxiliary Chain"
                successPrefix="Auxiliary Session"
              />
            }
          />
          <Route
            path="/test-timer"
            element={
              <TimerPage
                durationSeconds={5}
                title="Test Chain"
                successPrefix="Test Session"
                storageKey="test-chain-sessions"
              />
            }
          />
          <Route path="/rsip" element={<RsipComingSoon />} />
          <Route path="/core-principles" element={<CorePrinciples />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
