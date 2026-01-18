import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../utils/supabase/client'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/signin',
}) => {
  const { user, profile, loading } = useAuth()
  // Only wait for profile on first load, not every time
  const [waitingForProfile, setWaitingForProfile] = React.useState(false)

  // Give profile time to load after user is authenticated - but only briefly
  React.useEffect(() => {
    if (user && !profile && !loading) {
      // Only show waiting state briefly (500ms) to avoid flickering
      setWaitingForProfile(true)
      const timer = setTimeout(() => {
        setWaitingForProfile(false)
      }, 500) // Reduced to 500ms - profile should load faster
      
      return () => clearTimeout(timer)
    } else {
      setWaitingForProfile(false)
    }
  }, [user, profile, loading])

  // Show loading while we wait for auth to initialize
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600">Loading...</p>
        </div>
      </div>
    )
  }

  // No user at all - redirect to sign in
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to sign in')
    return <Navigate to={redirectTo} replace />
  }

  // If we have a user but no profile yet and still waiting briefly
  if (!profile && waitingForProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600">Loading...</p>
        </div>
      </div>
    )
  }

  // User exists - allow access (profile will load in background)
  if (!profile) {
    console.log('ProtectedRoute: User exists but no profile yet, allowing access')
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page. This page is restricted to{' '}
            {allowedRoles.join(', ')} only.
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role: <span className="font-semibold">{profile.role}</span>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Helper hook to check permissions
export const usePermissions = () => {
  const { profile } = useAuth()

  return {
    canStream: profile?.role === 'scholar' || profile?.role === 'imam',
    canDonate: profile?.role === 'user',
    canBookConsultation: profile?.role === 'user',
    canManageConsultations: profile?.role === 'scholar' || profile?.role === 'imam',
    canAccessWallet: profile?.role === 'scholar' || profile?.role === 'imam',
    isScholar: profile?.role === 'scholar',
    isImam: profile?.role === 'imam',
    isUser: profile?.role === 'user',
    isAdmin: profile?.role === 'admin',
  }
}
