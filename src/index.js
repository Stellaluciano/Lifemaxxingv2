import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const rootEl = document.getElementById('root');

// 1) 只要 index.js 执行了，就一定会显示这行字
if (rootEl) rootEl.innerHTML = 'STAGE 1: index.js executed';

// 2) 把任何同步错误显示到页面上
window.addEventListener('error', (e) => {
  if (rootEl) {
    rootEl.innerHTML =
      'ERROR: ' + (e.message || e.error || 'unknown error');
  }
});

// 3) 把任何未处理的 Promise rejection 显示到页面上
window.addEventListener('unhandledrejection', (e) => {
  if (rootEl) {
    rootEl.innerHTML =
      'PROMISE REJECTION: ' + (e.reason?.message || String(e.reason));
  }
});

try {
  // 4) try render
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // 5) 如果 render 成功启动，先清掉 STAGE 文本（让 App 接管 UI）
  if (rootEl) rootEl.innerHTML = '';
} catch (err) {
  if (rootEl) rootEl.innerHTML = 'CATCH: ' + (err?.message || String(err));
}

reportWebVitals();
