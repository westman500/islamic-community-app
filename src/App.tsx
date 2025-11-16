import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Auth components
import { UserSignIn } from './components/UserSignIn'
import { UserSignUp } from './components/UserSignUp'

// Islamic features (accessible to all authenticated users)
import { PrayerTimes } from './components/PrayerTimes'
import { QuranReader } from './components/QuranReader'
import { QiblaDirection } from './components/QiblaDirection'

// Member-only components
import { UserPrayerServiceViewer } from './components/UserPrayerServiceViewer'
import { ZakatDonation } from './components/ZakatDonation'
import { ConsultationBooking } from './components/ConsultationBooking'

// Scholar/Imam-only components
import { ScholarLiveStream } from './components/ScholarLiveStream'
import { ScholarConsultationManager } from './components/ScholarConsultationManager'

// New components
import { LivestreamDiscovery } from './components/LivestreamDiscovery'
import { ProfileSettings } from './components/ProfileSettings'
import { ScholarProfileViewer } from './components/ScholarProfileViewer'
import { ConsultationMessaging } from './components/ConsultationMessaging'
import { ReviewSubmissionForm } from './components/ReviewSubmissionForm'
import { AccountDeletion } from './components/AccountDeletion'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signin" element={<UserSignIn />} />
            <Route path="/signup" element={<UserSignUp />} />

            {/* Islamic features - All authenticated users */}
            <Route
              path="/prayer-times"
              element={
                <ProtectedRoute>
                  <PrayerTimes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quran"
              element={
                <ProtectedRoute>
                  <QuranReader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qibla"
              element={
                <ProtectedRoute>
                  <QiblaDirection />
                </ProtectedRoute>
              }
            />

            {/* Member-only routes */}
            <Route
              path="/watch-stream"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <UserPrayerServiceViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donate"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <ZakatDonation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book-consultation"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <ConsultationBooking />
                </ProtectedRoute>
              }
            />

            {/* Scholar/Imam-only routes */}
            <Route
              path="/start-stream"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarLiveStream />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-consultations"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarConsultationManager />
                </ProtectedRoute>
              }
            />

            {/* Shared routes (all authenticated users) */}
            <Route
              path="/livestreams"
              element={
                <ProtectedRoute>
                  <LivestreamDiscovery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile-settings"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scholar/:scholarId"
              element={
                <ProtectedRoute>
                  <ScholarProfileViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultation/:consultationId/messages"
              element={
                <ProtectedRoute>
                  <ConsultationMessaging />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultation/:consultationId/review"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <ReviewSubmissionForm 
                    consultationId={''} 
                    scholarId={''} 
                    scholarName={''} 
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delete-account"
              element={
                <ProtectedRoute>
                  <AccountDeletion />
                </ProtectedRoute>
              }
            />

            {/* Dashboard redirect based on role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Helper component to redirect to role-specific dashboard
function DashboardRedirect() {
  const { profile } = useAuth()

  if (profile?.role === 'scholar' || profile?.role === 'imam') {
    return <Navigate to="/start-stream" replace />
  } else {
    return <Navigate to="/watch-stream" replace />
  }
}

// 404 page
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">Page not found</p>
        <a href="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

export default App
