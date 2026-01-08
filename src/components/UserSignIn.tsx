import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase/client'
import { setEmeraldStatusBar } from '../utils/statusBar'

export const UserSignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Clear any stale loading states on mount
  React.useEffect(() => {
    setLoading(false)
    setError('')
    
    // Set emerald status bar
    setEmeraldStatusBar().catch(console.error)
    
    // Load remembered credentials
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    const rememberedPassword = localStorage.getItem('rememberedPassword')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
    if (rememberedPassword) {
      setPassword(rememberedPassword)
    }
    
    // Force clear any stuck states for existing accounts
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('clear') === 'true') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }, [])

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
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

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Sign-in timeout reached, resetting loading state')
      setLoading(false)
      setError('Sign-in is taking too long. Please refresh and try again.')
    }, 15000) // 15 second timeout

    try {
      console.log('UserSignIn: Calling signIn...')
      await signIn(email, password)
      console.log('UserSignIn: signIn completed successfully')
      
      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
        localStorage.setItem('rememberedPassword', password)
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberedPassword')
      }
      
      // Wait a bit for profile to load before navigating
      console.log('UserSignIn: Waiting for profile to load...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      clearTimeout(timeoutId)
      setLoading(false)
      
      console.log('UserSignIn: Navigating to dashboard...')
      // Navigate after successful sign-in
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('UserSignIn: Sign in error:', err)
      clearTimeout(timeoutId)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      setResetMessage('Password reset link sent! Check your email inbox.')
      setResetEmail('')
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetMessage('')
      }, 3000)
    } catch (err: any) {
      setResetMessage(err.message || 'Failed to send reset link')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white overflow-y-auto">
      <div className="container mx-auto p-4 max-w-md py-8">
        {/* Islamic Greeting Banner */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <img src="/masjid-logo.png" alt="Masjid Logo" className="h-20 w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-1" style={{ fontFamily: '"Amiri", serif' }}>
            السلام عليكم
          </h2>
          <p className="text-sm text-emerald-600 font-semibold">As-salamu alaykum</p>
          <div className="flex items-center justify-center mt-2 text-xs text-gray-600">
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

              <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="rememberMe" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>

            {showForgotPassword && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Reset Password</h3>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full"
                  />
                  {resetMessage && (
                    <p className={`text-sm ${resetMessage.includes('sent') ? 'text-green-700' : 'text-red-700'}`}>
                      {resetMessage}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

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
