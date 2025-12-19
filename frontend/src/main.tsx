import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWithAuth from './AppWithAuth.tsx'
import './index.css'
import { offlineService } from './services/offlineService'

// Register service worker for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    offlineService.registerServiceWorker().then((success) => {
      if (success) {
        console.log('Service worker registered for offline support');
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithAuth />
  </React.StrictMode>,
)
