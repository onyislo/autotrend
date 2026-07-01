import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Router from './components/Router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>
);
