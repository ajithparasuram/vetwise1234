import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Web build defaults to staff variant (full app with role switcher).
// Mobile builds use main-client.tsx / main-staff.tsx which set the variant.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App variant="staff" />
  </StrictMode>
);
