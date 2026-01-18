import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import { setEmeraldStatusBar } from '../utils/statusBar'
import { Eye, EyeOff } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

export const UserSignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'user' | 'imam' | 'scholar'>('user')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { signUp } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    // Set emerald status bar
    setEmeraldStatusBar().catch(console.error)
    
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
    setError('')
    setSuccess('')

    if (!agreedToTerms) {
      setError('Please agree to the Privacy Policy and Terms of Service')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      console.log('📝 Starting signup for:', email)
      await signUp(email, password, role, fullName)
      console.log('✅ Signup successful, navigating to dashboard...')
      // Signup successful - navigate to dashboard immediately
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('❌ Signup error:', err)
      setLoading(false)
      if (err.message === 'CONFIRMATION_REQUIRED') {
        // Email confirmation is enabled in Supabase - show message
        setSuccess('Account created! Please check your email to confirm, then sign in.')
        setTimeout(() => navigate('/signin'), 2500)
      } else if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('This email is already registered. Please sign in instead.')
      } else {
        setError(err.message || 'Failed to create account. Please try again.')
      }
    }
  }

  return (
    <>
      {/* Green background for status bar area */}
      <div 
        className="fixed top-0 left-0 right-0 bg-emerald-600 z-40"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto p-4 max-w-md py-8">
        {/* Islamic Greeting Banner */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <img src="/crescent-logo.svg" alt="Islamic Crescent" className="h-16 w-16" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-1" style={{ fontFamily: '"Amiri", serif' }}>
            مرحبا
          </h2>
          <p className="text-sm text-emerald-600 font-semibold">Marhaban - Welcome</p>
          <div className="flex items-center justify-center mt-2 text-xs text-gray-600">
            <span>🕐 {formatTime()}</span>
          </div>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription className="text-emerald-100">Join our Islamic community platform</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Account Type
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'imam' | 'scholar')}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="user">Community Member</option>
                <option value="imam">Imam</option>
                <option value="scholar">Scholar</option>
              </select>
            </div>

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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-md">
                <p className="text-sm text-emerald-800 font-medium mb-2">✅ {success}</p>
                <p className="text-xs text-emerald-700">
                  📧 Check your spam folder if you don't see the email within a few minutes.
                </p>
              </div>
            )}

            {/* Privacy Policy Agreement */}
            <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="text-xs text-gray-700">
                I agree to the{' '}
                <span 
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const url = 'https://petal-salto-1a6.notion.site/MASJIDMOBILE-APP-PRIVACY-POLICY-EULA-2cd859eb5c00806a9948eb3d1695f9dc'
                    if (Capacitor.isNativePlatform()) {
                      try {
                        const { Browser } = await import('@capacitor/browser')
                        await Browser.open({ url })
                      } catch {
                        window.open(url, '_blank')
                      }
                    } else {
                      window.open(url, '_blank')
                    }
                  }}
                  className="text-emerald-600 hover:underline font-medium cursor-pointer"
                >
                  Privacy Policy
                </span>{' '}
                and{' '}
                <span 
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const url = 'https://petal-salto-1a6.notion.site/MASJID-PRIVACY-POLICY-TERMS-OF-SERVICE-END-USER-LICENSE-AGREEMENT-EULA-2cd859eb5c00806a9948eb3d1695f9dc'
                    if (Capacitor.isNativePlatform()) {
                      try {
                        const { Browser } = await import('@capacitor/browser')
                        await Browser.open({ url })
                      } catch {
                        window.open(url, '_blank')
                      }
                    } else {
                      window.open(url, '_blank')
                    }
                  }}
                  className="text-emerald-600 hover:underline font-medium cursor-pointer"
                >
                  Terms of Service
                </span>
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold" 
              disabled={loading || !agreedToTerms}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{' '}
              <a href="/signin" className="text-emerald-600 hover:underline font-medium">
                Sign In
              </a>
            </div>
          </form>
        </CardContent>
        </Card>
        
        {/* Bottom padding to ensure button is always visible above keyboard */}
        <div className="h-32"></div>
      </div>
    </div>
    </>
  )
}
