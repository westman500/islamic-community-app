import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { ArrowLeft, BookOpen, Compass, Heart, Video, MapPin, Calendar, Bell, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showBack?: boolean
  showBottomNav?: boolean
}

export function MobileLayout({ 
  children, 
  title, 
  showBack = true, 
  showBottomNav = true 
}: MobileLayoutProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isScholar = profile?.role === 'scholar' || profile?.role === 'imam'

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-emerald-500 mr-2"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="flex justify-around items-center py-2 px-2 max-w-2xl mx-auto">
            <NavButton 
              icon={MapPin} 
              label="Masjid" 
              onClick={() => navigate('/dashboard')} 
            />
            <NavButton 
              icon={Video} 
              label="Live" 
              onClick={() => navigate('/livestreams')} 
            />
            <NavButton 
              icon={BookOpen} 
              label="Quran" 
              onClick={() => navigate('/quran')} 
            />
            <NavButton 
              icon={Compass} 
              label="Qibla" 
              onClick={() => navigate('/qibla')} 
            />
            <NavButton 
              icon={Heart} 
              label="Zakat" 
              onClick={() => navigate('/donate')} 
            />
            {isScholar && (
              <NavButton 
                icon={Wallet} 
                label="Wallet" 
                onClick={() => navigate('/manage-consultations')} 
              />
            )}
            <NavButton 
              icon={Calendar} 
              label="Activities" 
              onClick={() => navigate('/dashboard')} 
            />
            <NavButton 
              icon={Bell} 
              label="Notif" 
              onClick={() => navigate('/dashboard')} 
            />
          </div>
        </div>
      )}
    </div>
  )
}

function NavButton({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: any
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-colors text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  )
}
