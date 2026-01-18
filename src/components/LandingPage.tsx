import { useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Building2, BookOpen, Users, Coins, Calendar, MessageCircle, Globe } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { setEmeraldStatusBar } from '../utils/statusBar'

export function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Set emerald status bar to match header
    setEmeraldStatusBar().catch(console.error)
  }, [])

  const features = [
    {
      icon: Calendar,
      title: 'Prayer Times',
      description: 'Accurate prayer times for your location with notifications'
    },
    {
      icon: BookOpen,
      title: 'Quran Reader',
      description: 'Read and study the Holy Quran with translations'
    },
    {
      icon: Users,
      title: 'Scholar Consultation',
      description: 'Connect with verified Islamic scholars and imams'
    },
    {
      icon: Coins,
      title: 'Masjid Coin',
      description: 'Earn rewards and support your community'
    },
    {
      icon: Globe,
      title: 'Live Streams',
      description: 'Watch live Islamic lectures and prayer services'
    },
    {
      icon: MessageCircle,
      title: 'Community',
      description: 'Connect with Muslims worldwide'
    }
  ]

  return (
    <>
      {/* White background for status bar area on landing page */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white z-40"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Header - Fixed at top */}
      <header className="fixed left-0 right-0 bg-white shadow-lg z-50 border-b border-gray-100" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/masjid-logo.png" 
              alt="Masjid" 
              className="h-10 sm:h-12 w-auto"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(5, 150, 105, 0.3))'
              }}
            />
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/signin')}
              className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-sm sm:text-base px-2 sm:px-4 h-9 sm:h-10"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base px-3 sm:px-4 h-9 sm:h-10"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 sm:h-20"></div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-300/30 rounded-full blur-3xl animate-pulse"></div>
            <img 
              src="/masjid-logo.png" 
              alt="Masjid Mobile" 
              className="h-48 w-auto relative z-10"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 40px rgba(16, 185, 129, 0.6)) drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3))',
                transform: 'scale(1.1)'
              }}
            />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4" style={{ fontFamily: '"Amiri", serif' }}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </h1>
        
        <p className="text-xl md:text-2xl text-emerald-700 font-semibold mb-3" style={{ fontFamily: '"Amiri", serif' }}>
          As-salamu alaykum
        </p>
        
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Welcome to MasjidMobile
        </h2>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Connect with scholars, read Quran, track prayer times, and strengthen your faith 
          with MasjidMobile - your comprehensive Islamic platform.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/signup')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
          >
            <Building2 className="mr-2 h-5 w-5" />
            Join the Community
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate('/signin')}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-lg px-8 py-6"
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for Your Islamic Journey
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h3>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of Muslims using Masjid Mobile to strengthen their faith and connect with the community.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-white text-emerald-700 hover:bg-emerald-50 text-lg px-8 py-6 shadow-lg"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <img src="/masjid-logo.png" alt="Masjid" className="h-10 w-auto mb-4 brightness-0 invert" />
              <p className="text-sm">
                Your trusted Islamic community platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy-policy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="hover:text-emerald-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <p className="text-sm">
                Email: support@masjidmobile.com
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>© 2025 Masjid Mobile. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}
