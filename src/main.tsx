import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { App as CapacitorApp } from '@capacitor/app'

// Handle app lifecycle to prevent reload on sleep/resume and maintain session
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  console.log('App state changed. Is active:', isActive)
  
  if (isActive) {
    console.log('App resumed from background - Session preserved')
    // Update activity timestamp to keep session alive
    localStorage.setItem('masjid-last-activity', new Date().toISOString())
  } else {
    console.log('App went to background - Saving session state')
    // Save current timestamp before going to background
    localStorage.setItem('masjid-last-activity', new Date().toISOString())
  }
})

// Handle pause events - save session before app closes
CapacitorApp.addListener('pause', () => {
  console.log('App paused - Preserving authentication session')
  localStorage.setItem('masjid-last-activity', new Date().toISOString())
  localStorage.setItem('masjid-app-paused', 'true')
})

// Handle resume events - restore session
CapacitorApp.addListener('resume', () => {
  console.log('App resumed - Restoring authentication session')
  localStorage.setItem('masjid-last-activity', new Date().toISOString())
  localStorage.removeItem('masjid-app-paused')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
