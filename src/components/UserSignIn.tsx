import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'

export const UserSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState('Loading...')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
            )
            const data = await response.json()
            setLocation(data.address?.city || data.address?.town || 'Your Location')
          } catch {
            setLocation('Unknown')
          }
        },
        () => setLocation('Unavailable')
      )
    }
  }, [])

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('UserSignIn: Form submitted')
    setError('')
    setLoading(true)

    try {
      console.log('UserSignIn: Calling signIn...')
      await signIn(email, password)
      console.log('UserSignIn: signIn completed successfully, navigating...')
      
      // Navigate immediately - the AuthContext and ProtectedRoute will handle the rest
      navigate('/dashboard', { replace: true })
      // Keep loading true to prevent double submission
    } catch (err: any) {
      console.error('UserSignIn: Sign in error:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white overflow-y-auto">
      <div className="container mx-auto p-4 max-w-md py-8">
        {/* Islamic Greeting Banner */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <img src="/crescent-logo.svg" alt="Islamic Crescent" className="h-16 w-16" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-1" style={{ fontFamily: '"Amiri", serif' }}>
            السلام عليكم
          </h2>
          <p className="text-sm text-emerald-600 font-semibold">As-salamu alaykum</p>
          <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-gray-600">
            <span>📍 {location}</span>
            <span>🕐 {formatTime()}</span>
          </div>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription className="text-emerald-100">Welcome back! Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive font-medium mb-2">❌ {error}</p>
                {error.includes('verify your email') && (
                  <div className="mt-3 text-xs text-gray-700 bg-white p-3 rounded border border-gray-200">
                    <p className="font-semibold mb-1">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Check your email inbox for the confirmation link</li>
                      <li>Click the confirmation link in the email</li>
                      <li>Return here and sign in with your credentials</li>
                    </ol>
                    <p className="mt-2 text-emerald-700">
                      📧 Check your spam folder if you don't see the email
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2">
              Don't have an account?{' '}
              <a href="/signup" className="text-emerald-600 hover:underline font-medium">
                Sign Up
              </a>
            </div>
          </form>
        </CardContent>
        </Card>
        
        {/* Bottom padding to ensure button is always visible above keyboard */}
        <div className="h-32"></div>
      </div>
    </div>
  )
}
