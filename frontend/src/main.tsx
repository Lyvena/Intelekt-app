import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWithAuth from './AppWithAuth.tsx'
import { ShareViewer } from './components/share/ShareViewer'
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

const shareMatch = window.location.pathname.match(/^\/share\/([\w-]+)/);
const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {shareMatch ? <ShareViewer token={shareMatch[1]} /> : <AppWithAuth />}
  </React.StrictMode>,
)
