import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Prevent DevTools from auto-opening
if (typeof window !== 'undefined') {
  // Remove any debugger statements that might have been left
  const originalDebugger = window.debugger;
  // @ts-ignore
  window.debugger = undefined;
  
  // Ensure DevTools are closed on load
  // This is a no-op in production, but prevents accidental openings in dev
  const locationHash = window.location.hash;
  if (locationHash === '#devtools') {
    window.location.hash = '';
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
