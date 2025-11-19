import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { App as CapacitorApp } from '@capacitor/app'

// Handle app lifecycle to prevent reload on sleep/resume
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  console.log('App state changed. Is active:', isActive)
  // Don't reload the app when it becomes active again
  if (isActive) {
    console.log('App resumed from background')
  } else {
    console.log('App went to background')
  }
})

// Handle pause/resume events
CapacitorApp.addListener('pause', () => {
  console.log('App paused - phone sleeping or user switched apps')
})

CapacitorApp.addListener('resume', () => {
  console.log('App resumed - phone woke up or user returned to app')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
