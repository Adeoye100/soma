import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { displaySelfXSSWarning } from './utils/security';

// Initialize security protections
displaySelfXSSWarning();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
