import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import StudyRoom from './components/StudyRoom';
import TimerPage from './components/TimerPage';
import './App.css';
import './firebase';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<StudyRoom />} />
          <Route path="/timer" element={<TimerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
