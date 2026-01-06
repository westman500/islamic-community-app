import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import {
  BookOpen,
  Compass,
  Heart,
  Video,
  Calendar,
  Bell,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  UtensilsCrossed,
  MapPin,
  Sparkles,
  LogOut,
  Film,
  Coins,
  TrendingUp
} from 'lucide-react'
import { CompactPrayerTimes } from './CompactPrayerTimes'

export function Dashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [startY, setStartY] = React.useState(0)
  const [pullDistance, setPullDistance] = React.useState(0)
  const dashboardRef = React.useRef<HTMLDivElement>(null)

  const isScholar = profile?.role === 'scholar' || profile?.role === 'imam'
  const fullName = profile?.full_name || 'User'

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/signin')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (dashboardRef.current && dashboardRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const distance = currentY - startY
    
    if (distance > 0 && distance < 150) {
      setPullDistance(distance)
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(0)
      
      // Refresh data without reloading the page
      try {
        // Update time
        setCurrentTime(new Date())
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800))
      } catch (error) {
        console.error('Refresh error:', error)
      } finally {
        setIsRefreshing(false)
      }
    } else {
      setPullDistance(0)
    }
    setStartY(0)
  }

  // Islamic greeting based on time of day
  const getIslamicGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'صباح الخير - Good Morning'
    if (hour < 18) return 'مساء الخير - Good Afternoon'
    return 'مساء الخير - Good Evening'
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Feature cards configuration
  const commonFeatures = [
    {
      title: 'Holy Quran',
      description: 'Read with audio',
      detail: 'Read and listen to the Holy Quran',
      icon: BookOpen,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600',
      path: '/quran'
    },
    {
      title: 'Qibla Direction',
      description: 'Find prayer direction',
      detail: 'Find the direction to Makkah',
      icon: Compass,
      color: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      buttonColor: 'bg-cyan-500 hover:bg-cyan-600',
      path: '/qibla'
    }
  ]

  const userFeatures = [
    {
      title: 'Join Live Streams',
      description: 'Watch prayers & lectures',
      detail: 'Join existing streams from scholars and imams',
      icon: Video,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      path: '/livestreams'
    },
    {
      title: 'Find Scholars',
      description: 'Book consultations',
      detail: 'Browse available scholars and book consultation sessions',
      icon: GraduationCap,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
      path: '/book-consultation'
    },
    {
      title: 'My Bookings',
      description: 'View your consultations',
      detail: 'Manage your consultation bookings and chat with scholars',
      icon: Calendar,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      buttonColor: 'bg-purple-500 hover:bg-purple-600',
      path: '/book-consultation'
    },
    {
      title: 'Zakat & Donations',
      description: 'Support our community',
      detail: 'Give Zakat and support community initiatives',
      icon: Heart,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600',
      path: '/donate'
    },
    {
      title: 'Islamic Reels',
      description: 'Watch & Upload Reels',
      detail: 'Share Islamic content through short videos',
      icon: Film,
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
      buttonColor: 'bg-pink-500 hover:bg-pink-600',
      path: '/reels'
    },
    {
      title: 'Activities & Restaurants',
      description: 'Community & Halal Food',
      detail: 'Discover events and halal dining options',
      icon: UtensilsCrossed,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
      buttonColor: 'bg-orange-500 hover:bg-orange-600',
      path: '/activities'
    }
  ]

  const scholarFeatures = [
    {
      title: 'Start Live Stream',
      description: 'Begin broadcasting',
      detail: 'Start streaming live prayer service or lecture',
      icon: Video,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      path: '/start-stream'
    },
    {
      title: 'Manage Consultations',
      description: 'Consultation & Activities',
      detail: 'View consultation bookings, activities, and chat with members',
      icon: Calendar,
      color: 'bg-violet-50',
      iconColor: 'text-violet-600',
      buttonColor: 'bg-violet-500 hover:bg-violet-600',
      path: '/manage-consultations'
    },
    {
      title: 'Scholar Analytics',
      description: 'Performance & Insights',
      detail: 'View consultation history, earnings analytics, and statistics',
      icon: BarChart3,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-500 hover:bg-amber-600',
      path: '/scholar-dashboard'
    },
    {
      title: 'Manage Zakat and Donations',
      description: 'Zakat & Charitable Giving',
      detail: 'Manage zakat from livestreams and donations, view history, and withdraw funds',
      icon: Heart,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600',
      path: '/wallet'
    }
  ]

  const premiumFeatures = [
    {
      title: 'Access premium features and content',
      icon: Sparkles,
      color: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-500 hover:bg-amber-600',
      buttonText: 'Open'
    },
    {
      title: 'Discover and book halal restaurants',
      icon: UtensilsCrossed,
      color: 'bg-gradient-to-br from-cyan-50 to-blue-50',
      iconColor: 'text-cyan-600',
      buttonColor: 'bg-cyan-500 hover:bg-cyan-600',
      buttonText: 'Open',
      path: '/activities/restaurant'
    }
  ]

  const features = isScholar ? scholarFeatures : userFeatures

  return (
    <>
      {/* Green background for status bar area */}
      <div 
        className="fixed top-0 left-0 right-0 bg-emerald-600 z-40"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      
      <div 
        ref={dashboardRef}
        className="min-h-screen bg-gray-50 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed left-0 right-0 z-40 flex items-end justify-center bg-emerald-600 text-white transition-all duration-300"
          style={{ 
            top: 0,
            height: `calc(${pullDistance}px + env(safe-area-inset-top))`, 
            opacity: pullDistance / 100,
            paddingBottom: '8px'
          }}
        >
          <div className="text-sm font-medium">
            {pullDistance > 80 ? '↓ Release to refresh' : '↓ Pull down to refresh'}
          </div>
        </div>
      )}
      
      {/* Refreshing spinner */}
      {isRefreshing && (
        <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-full p-3 shadow-lg">
            <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-emerald-600 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-lg blur-md"></div>
              <img 
                src="/masjid-logo-dashboard.png" 
                alt="Masjid Logo" 
                className="h-24 w-24 sm:h-28 sm:w-28 object-contain relative z-10"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 255, 255, 0.7))' }}
                crossOrigin="anonymous"
              />
            </div>
            <div>
              <p className="text-xs text-emerald-100">{getIslamicGreeting()}</p>
              <p className="text-white text-sm font-semibold">As-salamu alaykum, {fullName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-emerald-500 rounded-full"
                onClick={() => navigate('/profile-settings')}
                title="Settings"
              >
                <Settings className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-red-500 rounded-full"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <LogOut className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-sm font-bold text-white">{formatTime()}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <div className="p-4 space-y-6">
          {/* Compact Prayer Times - New Component */}
          <CompactPrayerTimes />

        {/* Premium Features (Top Banner Style) */}
        {!isScholar && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {premiumFeatures.map((feature, index) => (
              <Card key={index} className={`${feature.color} border-none shadow-md`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 font-medium">{feature.title}</p>
                    </div>
                    <Button 
                      className={`${feature.buttonColor} text-white ml-4`}
                      onClick={() => feature.path && navigate(feature.path)}
                    >
                      {feature.buttonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Common Islamic Features */}
        <div className="grid grid-cols-2 gap-2">
          {commonFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className={`${feature.color} border-none shadow-md hover:shadow-lg transition-all`}>
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`p-3 rounded-xl shadow-md ${feature.color}`}>
                      <Icon className={`h-8 w-8 ${feature.iconColor} drop-shadow-md`} />
                    </div>
                    <h3 className={`text-xs font-bold ${feature.iconColor}`}>
                      {feature.title}
                    </h3>
                    <Button 
                      className={`w-full ${feature.buttonColor} text-white text-xs h-8 shadow-md hover:shadow-lg`}
                      onClick={() => navigate(feature.path)}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Role-specific Features */}
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className={`${feature.color} border-none shadow-md hover:shadow-lg transition-all`}>
                <CardContent className="p-2.5">
                  <div className="flex flex-col items-center text-center space-y-1.5">
                    <div className={`p-2.5 rounded-xl shadow-md ${feature.color}`}>
                      <Icon className={`h-7 w-7 ${feature.iconColor} drop-shadow-md`} />
                    </div>
                    <h3 className={`text-[11px] font-bold ${feature.iconColor} leading-tight`}>
                      {feature.title}
                    </h3>
                    <Button 
                      className={`w-full ${feature.buttonColor} text-white text-[11px] h-7 shadow-md hover:shadow-lg`}
                      onClick={() => navigate(feature.path)}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Masjid Coin Wallet - Members Only */}
        {!isScholar && (
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 shadow-md">
                    <Coins className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-800">Coin Wallet</h3>
                  </div>
                </div>
                <Button 
                  className="bg-amber-500 hover:bg-amber-600 text-white shadow-md h-8 text-xs"
                  onClick={() => navigate('/coin-wallet')}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Featured Jummah Prayer - Only for Members */}
        {!isScholar && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">This Week's Jummah</h2>
            
            {/* Jummah Featured Card */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow mb-6">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 shadow-md">
                    <Users className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-gray-800">Friday Congregational Prayer</h3>
                      <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">LIVE</span>
                    </div>
                    <p className="text-gray-600 mb-4">Join us live for the weekly Friday prayer service with khutbah (sermon) delivered in Arabic and English.</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        <span>Led by Imam Abdullah</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>Main Prayer Hall - Live Stream</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="font-semibold">Every Friday at 12:30 PM</span>
                      </div>
                    </div>

                    <Button 
                      className="bg-green-500 hover:bg-green-600 text-white w-full shadow-md hover:shadow-lg"
                      onClick={() => navigate('/livestreams')}
                    >
                      Join Live Stream
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-between items-center py-1 px-0.5 max-w-2xl mx-auto gap-0.5">
          <NavButton icon={MapPin} label="Masjid" active onClick={() => navigate('/dashboard')} />
          <NavButton 
            icon={Video} 
            label="Live" 
            onClick={() => isScholar ? navigate('/start-stream') : navigate('/livestreams')} 
          />
          <NavButton icon={BookOpen} label="Quran" onClick={() => navigate('/quran')} />
          <NavButton icon={Compass} label="Qibla" onClick={() => navigate('/qibla')} />
          {isScholar ? (
            <NavButton icon={Calendar} label="Manage" onClick={() => navigate('/manage-consultations')} />
          ) : (
            <>
              <NavButton icon={Calendar} label="Activities" onClick={() => navigate('/activity-categories')} />
              <NavButton icon={Bell} label="Bookings" onClick={() => navigate('/my-bookings')} />
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

// Navigation Button Component
function NavButton({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 px-0.5 rounded-lg transition-all ${
        active 
          ? 'text-emerald-600 bg-emerald-100' 
          : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${active ? 'text-emerald-600' : ''}`} />
      <span className="text-[9px] sm:text-[10px] mt-0.5 font-semibold leading-tight text-center truncate w-full">{label}</span>
    </button>
  )
}
