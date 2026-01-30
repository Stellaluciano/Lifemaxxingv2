import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 只用于调试：把错误显示到页面
const rootEl = document.getElementById('root');

if (rootEl) rootEl.innerHTML = 'STAGE 1: index.js executed';

window.addEventListener('error', (e) => {
  if (rootEl) {
    rootEl.innerHTML =
      'ERROR: ' + (e.message || e.error || 'unknown error');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (rootEl) {
    rootEl.innerHTML =
      'PROMISE REJECTION: ' + (e.reason?.message || String(e.reason));
  }
});

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
