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

// Render the app
root.render(AppWrapper);
