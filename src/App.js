import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import StudyRoom from './components/StudyRoom';
import TimerPage from './components/TimerPage';
import RsipComingSoon from './pages/RsipComingSoon';
import CorePrinciples from './pages/CorePrinciples';
import './App.css';
import './firebase';
import {
  SACRED_INTENT_STORAGE_KEY,
  MAIN_CHAIN_DURATION_KEY,
  AUX_CHAIN_DURATION_KEY,
  MAIN_CHAIN_SESSION_KEY,
  AUX_CHAIN_SESSION_KEY,
} from './constants';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<StudyRoom />} />
          <Route
            path="/timer"
            element={
              <TimerPage
                intentStorageKey={SACRED_INTENT_STORAGE_KEY}
                storageKey={MAIN_CHAIN_SESSION_KEY}
                durationPreferenceKey={MAIN_CHAIN_DURATION_KEY}
              />
            }
          />
          <Route
            path="/auxiliary-timer"
            element={
              <TimerPage
                durationSeconds={15 * 60}
                title="Auxiliary Chain"
                successPrefix="Auxiliary Session"
                intentStorageKey={SACRED_INTENT_STORAGE_KEY}
                durationPreferenceKey={AUX_CHAIN_DURATION_KEY}
                storageKey={AUX_CHAIN_SESSION_KEY}
                isAuxiliary
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
