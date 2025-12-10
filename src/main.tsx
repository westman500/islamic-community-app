import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Setup Capacitor listeners only on native platforms (not web)
const setupCapacitor = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) {
      console.log('Running on web - Capacitor features disabled')
      return
    }

    const { App: CapacitorApp } = await import('@capacitor/app')
    
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      localStorage.setItem('masjid-last-activity', new Date().toISOString())
      console.log('App state changed:', isActive ? 'active' : 'background')
    })

    CapacitorApp.addListener('pause', () => {
      localStorage.setItem('masjid-last-activity', new Date().toISOString())
      localStorage.setItem('masjid-app-paused', 'true')
    })

    CapacitorApp.addListener('resume', () => {
      localStorage.setItem('masjid-last-activity', new Date().toISOString())
      localStorage.removeItem('masjid-app-paused')
    })
  } catch (err) {
    console.log('Capacitor not available:', err)
  }
}

console.log('🔧 main.tsx: File loaded')

setupCapacitor()

// Get root element (no loading screen shown)
const rootElement = document.getElementById('root')
console.log('🔧 Root element:', rootElement ? 'Found' : 'NOT FOUND')

// Catch all errors
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error)
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: red;">⚠️ Application Error</h1>
        <p><strong>Message:</strong> ${event.message}</p>
        <p><strong>File:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <details>
          <summary style="cursor: pointer; color: #059669; font-weight: bold;">Stack Trace</summary>
          <pre style="background: #f5f5f5; padding: 10px; overflow: auto; font-size: 12px;">${event.error?.stack || 'No stack trace available'}</pre>
        </details>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload App</button>
      </div>
    `
  }
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason)
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: red;">⚠️ Promise Rejection</h1>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${event.reason}</pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload App</button>
      </div>
    `
  }
})

// Render app with error boundary
try {
  if (!rootElement) {
    console.error('❌ Root element not found!')
    throw new Error('Root element not found in DOM!')
  }
  
  console.log('🚀 Step 1: Root element found, importing App...')
  console.log('🚀 Step 2: Creating React root...')
  
  const root = createRoot(rootElement)
  console.log('✅ Step 3: React root created, rendering App...')
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  
  console.log('✅ Step 4: React render() called - App should be mounting...')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: red;">❌ Failed to Initialize</h1>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto; white-space: pre-wrap;">${error instanceof Error ? error.message + '\n\n' + error.stack : String(error)}</pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload App</button>
      </div>
    `
  }
}
