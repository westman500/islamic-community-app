import { createRoot } from 'react-dom/client'

function TestApp() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#059669', color: 'white', minHeight: '100vh' }}>
      <h1>✅ React is Working!</h1>
      <p>Server: Running</p>
      <p>React: Loaded</p>
      <p>DOM: Mounted</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<TestApp />)
} else {
  document.body.innerHTML = '<h1 style="color:red;padding:20px;">ERROR: Root element not found</h1>'
}
