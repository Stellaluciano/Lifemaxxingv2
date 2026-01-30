import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';

const rootEl = document.getElementById('root');

window.addEventListener('error', (e) => {
  if (rootEl) rootEl.innerHTML = 'ERROR: ' + (e.message || 'unknown error');
});
window.addEventListener('unhandledrejection', (e) => {
  if (rootEl) rootEl.innerHTML = 'PROMISE REJECTION: ' + (e.reason?.message || String(e.reason));
});

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
