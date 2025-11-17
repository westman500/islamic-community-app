import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import {
  BookOpen,
  Compass,
  Heart,
  Wallet,
  Video,
  Calendar,
  MessageCircle,
  Bell,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  UtensilsCrossed,
  MapPin,
  Sparkles
} from 'lucide-react'

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const isScholar = profile?.role === 'scholar' || profile?.role === 'imam'
  const fullName = profile?.full_name || 'User'

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
      title: 'Live Streams',
      description: 'Start or join streams',
      detail: 'Host prayers & lectures or join existing streams',
      icon: Video,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      path: '/livestreams'
    },
    {
      title: 'Scholar Consultation',
      description: 'Manage consultations',
      detail: 'Manage incoming consultation requests and sessions',
      icon: MessageCircle,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
      path: '/book-consultation'
    },
    {
      title: 'Community Chat',
      description: 'Connect with Muslims',
      detail: 'Join discussions with the Muslim community',
      icon: Users,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      buttonColor: 'bg-purple-500 hover:bg-purple-600',
      path: '/livestreams'
    },
    {
      title: 'Zakat & Donations',
      description: 'Support our community',
      detail: 'View earnings from consultations and Zakat received during streams',
      icon: Heart,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600',
      path: '/donate'
    }
  ]

  const scholarFeatures = [
    {
      title: 'Start Live Stream',
      description: 'Begin prayer broadcast',
      detail: 'Start streaming live prayer service',
      icon: Video,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      path: '/start-stream'
    },
    {
      title: 'Scholar Dashboard',
      description: 'Manage your services',
      detail: 'View consultations and manage earnings',
      icon: BarChart3,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-500 hover:bg-amber-600',
      path: '/manage-consultations'
    },
    {
      title: 'Live Streams',
      description: 'Start or join streams',
      detail: 'Host prayers & lectures or join existing streams',
      icon: Video,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      path: '/livestreams'
    },
    {
      title: 'Scholar Consultation',
      description: 'Manage consultations',
      detail: 'Manage incoming consultation requests and sessions',
      icon: GraduationCap,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
      path: '/manage-consultations'
    },
    {
      title: 'Manage Bookings',
      description: 'Consultation requests',
      detail: 'View and respond to consultation requests',
      icon: Calendar,
      color: 'bg-violet-50',
      iconColor: 'text-violet-600',
      buttonColor: 'bg-violet-500 hover:bg-violet-600',
      path: '/manage-consultations'
    },
    {
      title: 'Wallet',
      description: 'Manage earnings',
      detail: 'View earnings from consultations and Zakat received during streams',
      icon: Wallet,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600',
      path: '/manage-consultations'
    },
    {
      title: 'Community Chat',
      description: 'Connect with Muslims',
      detail: 'Join discussions with the Muslim community',
      icon: MessageCircle,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      buttonColor: 'bg-purple-500 hover:bg-purple-600',
      path: '/livestreams'
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
      buttonText: 'Open'
    }
  ]

  const activityFeatures = [
    {
      title: 'Halal Restaurant Directory',
      description: 'Discover local halal restaurants and dining options in your area.',
      organizer: 'Organized by Community Partners',
      location: 'Various Locations',
      time: 'Available 24/7',
      icon: UtensilsCrossed,
      color: 'bg-gradient-to-br from-gray-50 to-gray-100',
      iconColor: 'text-gray-600',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Friday Congregational Prayer (Jummah)',
      description: 'Join us for the weekly Friday prayer service with khutbah (sermon) delivered in Arabic and English.',
      organizer: 'Organized by Imam Abdullah',
      location: 'Main Prayer Hall',
      time: 'Every Friday 12:30 PM',
      icon: Users,
      color: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Quran Recitation Classes',
      description: 'Learn proper Quranic recitation with Tajweed from certified instructors.',
      organizer: 'Organized by Sheikh Muhammad',
      location: 'Learning Center Room 2',
      time: 'Saturdays 10:00 AM',
      icon: BookOpen,
      color: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    }
  ]

  const features = isScholar ? scholarFeatures : userFeatures

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Masjid</h1>
            <p className="text-emerald-100 text-sm mt-1">Welcome, {fullName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-emerald-500"
            onClick={() => navigate('/profile-settings')}
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
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
                    <Button className={`${feature.buttonColor} text-white ml-4`}>
                      {feature.buttonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Common Islamic Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commonFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className={`${feature.color} border-none shadow-md hover:shadow-lg transition-shadow`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${feature.iconColor}`}>
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{feature.detail}</p>
                  <Button 
                    className={`w-full ${feature.buttonColor} text-white`}
                    onClick={() => navigate(feature.path)}
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Role-specific Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className={`${feature.color} border-none shadow-md hover:shadow-lg transition-shadow`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${feature.iconColor}`}>
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{feature.detail}</p>
                  <Button 
                    className={`w-full ${feature.buttonColor} text-white`}
                    onClick={() => navigate(feature.path)}
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Community Activities Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Community Activities</h2>
          <p className="text-gray-600 mb-6">
            Discover prayers, education, restaurants, services, and community events
          </p>

          <div className="space-y-4">
            {activityFeatures.map((activity) => {
              const Icon = activity.icon
              return (
                <Card key={activity.title} className={`${activity.color} border-none shadow-md hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-4 rounded-xl ${activity.color}`}>
                        <Icon className={`h-8 w-8 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{activity.title}</h3>
                        <p className="text-gray-600 mb-4">{activity.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            <span>{activity.organizer}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{activity.location}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{activity.time}</span>
                          </div>
                        </div>

                        <Button className={`${activity.buttonColor} text-white w-full`}>
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around items-center py-2 px-2 max-w-2xl mx-auto">
          <NavButton icon={MapPin} label="Masjid" active onClick={() => navigate('/dashboard')} />
          <NavButton icon={Video} label="Live" onClick={() => navigate('/livestreams')} />
          <NavButton icon={BookOpen} label="Quran" onClick={() => navigate('/quran')} />
          <NavButton icon={Compass} label="Qibla" onClick={() => navigate('/qibla')} />
          <NavButton icon={Heart} label="Zakat" onClick={() => navigate('/donate')} />
          {isScholar && (
            <NavButton icon={Wallet} label="Wallet" onClick={() => navigate('/manage-consultations')} />
          )}
          <NavButton icon={Calendar} label="Activities" onClick={() => navigate('/dashboard')} />
          <NavButton icon={Bell} label="Notifications" onClick={() => navigate('/dashboard')} />
        </div>
      </div>
    </div>
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
      className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-colors ${
        active 
          ? 'text-emerald-600' 
          : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? 'text-emerald-600' : ''}`} />
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  )
}
