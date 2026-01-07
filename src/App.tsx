 import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { initPushNotifications } from './utils/pushNotifications'
import { initializeStatusBar } from './utils/statusBar'

// Auth components
import { UserSignIn } from './components/UserSignIn'
import { UserSignUp } from './components/UserSignUp'

// Dashboard
import { Dashboard } from './components/Dashboard'
import { SplashScreen } from './components/SplashScreen'

// Legal pages
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { TermsOfService } from './components/TermsOfService'

// Islamic features (accessible to all authenticated users)
import { PrayerTimes } from './components/PrayerTimes'
import { QuranReader } from './components/QuranReader'
import { QiblaDirection } from './components/QiblaDirection'

// Member-only components
import { UserPrayerServiceViewer } from './components/UserPrayerServiceViewer'
import { ZakatDonation } from './components/ZakatDonation'
import { MasjidCoin } from './components/MasjidCoin'

// Scholar/Imam-only components
import ScholarLiveStream from './components/ScholarLiveStream'
import { ScholarConsultationManager } from './components/ScholarConsultationManager'
import { ScholarDashboard } from './components/ScholarDashboard'
import { ScholarWallet } from './components/ScholarWallet'
import { ScholarAvailability } from './components/ScholarAvailability'
import { ScholarConsultations } from './components/ScholarConsultations'

// New components
import { LivestreamDiscovery } from './components/LivestreamDiscovery'
import { ProfileSettings } from './components/ProfileSettings'
import { ScholarProfileViewer } from './components/ScholarProfileViewer'
import { ConsultationMessaging } from './components/ConsultationMessaging'
import { ReviewSubmissionForm } from './components/ReviewSubmissionForm'
import { AccountDeletion } from './components/AccountDeletion'
import { AvailableScholars } from './components/AvailableScholars'
import { MyBookings } from './components/MyBookings'
import { ActivityCategories } from './components/ActivityCategories'
import { ActivitiesByCategory } from './components/ActivitiesByCategory'
import { AgoraTest } from './components/AgoraTest'
import { TokenDiagnostics } from './components/TokenDiagnostics'
import { ConsultationBooking } from './components/ConsultationBooking'
import { ScreenshotUtility } from './components/ScreenshotUtility'
import { IslamicReels } from './components/IslamicReels'
import { RestaurantsListing } from './components/RestaurantsListing'
import { ActivitiesAndRestaurants } from './components/ActivitiesAndRestaurants'
import { LandingPage } from './components/LandingPage'

function App() {
  // Only show demo features (screenshot utility) in development mode on localhost
  // This ensures mobile builds never include demo features
  const isDevelopment = import.meta.env.DEV && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  )

  // Initialize push notifications and status bar when app loads
  useEffect(() => {
    initPushNotifications().catch(console.error)
    initializeStatusBar().catch(console.error)
  }, [])
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div id="app-root" className="min-h-screen bg-background">
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<SplashScreen />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/signin" element={<UserSignIn />} />
            <Route path="/signup" element={<UserSignUp />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* Diagnostic routes */}
            <Route
              path="/token-diagnostics"
              element={
                <ProtectedRoute>
                  <TokenDiagnostics />
                </ProtectedRoute>
              }
            />

            {/* Main Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

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
              path="/watch-stream/:channelName"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <UserPrayerServiceViewer />
                </ProtectedRoute>
              }
            />
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
                <ProtectedRoute>
                  <ZakatDonation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coin-wallet"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <MasjidCoin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book-consultation"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <AvailableScholars />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scholar/:scholarId/book"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <ConsultationBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity-categories"
              element={
                <ProtectedRoute>
                  <ActivityCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activities/:categoryId"
              element={
                <ProtectedRoute>
                  <ActivitiesByCategory />
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
            <Route
              path="/scholar-dashboard"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scholar-consultations"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarConsultations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarWallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scholar-consultations"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarConsultations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/availability"
              element={
                <ProtectedRoute allowedRoles={['scholar', 'imam']}>
                  <ScholarAvailability />
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
              path="/restaurants"
              element={
                <ProtectedRoute>
                  <RestaurantsListing />
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
            
            {/* Debug/Test Routes */}
            <Route
              path="/test-agora"
              element={
                <ProtectedRoute>
                  <AgoraTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity-categories"
              element={
                <ProtectedRoute>
                  <ActivityCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activities/:categoryId"
              element={
                <ProtectedRoute>
                  <ActivitiesByCategory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prayer-services"
              element={
                <ProtectedRoute>
                  <UserPrayerServiceViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/available-scholars"
              element={
                <ProtectedRoute>
                  <AvailableScholars />
                </ProtectedRoute>
              }
            />
            
            {/* Islamic Reels */}
            <Route
              path="/reels"
              element={
                <ProtectedRoute>
                  <IslamicReels />
                </ProtectedRoute>
              }
            />
            
            {/* Activities and Restaurants */}
            <Route
              path="/activities"
              element={
                <ProtectedRoute>
                  <ActivitiesAndRestaurants />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Screenshot utility - only in development */}
          {isDevelopment && <ScreenshotUtility />}
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
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
