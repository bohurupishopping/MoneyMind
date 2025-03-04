import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only use StrictMode in development
const AppWrapper = import.meta.env.DEV ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

const root = createRoot(document.getElementById('root')!);

// Prevent auto-refresh on visibility change
let visibilityTimeout: number;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Clear any pending refreshes when hidden
    if (visibilityTimeout) {
      window.clearTimeout(visibilityTimeout);
    }
  }
});

root.render(AppWrapper);
