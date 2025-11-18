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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    console.log('ProtectedRoute: No user or profile, redirecting to sign in')
    return <Navigate to={redirectTo} replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
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
