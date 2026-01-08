import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { ArrowLeft, BookOpen, Compass, Video, MapPin, Calendar, Bell } from 'lucide-react'
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
    <>
      {/* Green background for status bar area */}
      <div 
        className="fixed top-0 left-0 right-0 bg-emerald-600 z-40"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      
      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Fixed Header - stays at top on scroll */}
        <div className="fixed top-0 left-0 right-0 text-white p-4 z-50 shadow-lg" style={{ backgroundColor: '#059669', marginTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center max-w-[1200px] mx-auto">
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
            <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          </div>
        </div>

      {/* Content - with padding for fixed header and bottom nav */}
      <div className="flex-1 overflow-y-auto pb-20" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {children}
      </div>

      {/* Fixed Bottom Navigation - stays at bottom on scroll */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-between items-center py-1 px-0.5 max-w-2xl md:max-w-4xl lg:max-w-[1200px] mx-auto gap-0.5 md:gap-2">
            <NavButton 
              icon={MapPin} 
              label="Masjid" 
              onClick={() => navigate('/dashboard')} 
            />
            <NavButton 
              icon={Video} 
              label="Live" 
              onClick={() => isScholar ? navigate('/start-stream') : navigate('/livestreams')} 
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
            {isScholar ? (
              <>
                <NavButton 
                  icon={Calendar} 
                  label="Manage" 
                  onClick={() => navigate('/manage-consultations')} 
                />
              </>
            ) : (
              <>
                <NavButton 
                  icon={Calendar} 
                  label="Activities" 
                  onClick={() => navigate('/activity-categories')} 
                />
                <NavButton 
                  icon={Bell} 
                  label="Bookings" 
                  onClick={() => navigate('/my-bookings')} 
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
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
      className="flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 md:py-2 px-1 md:px-2 rounded-lg transition-all text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100"
    >
      <Icon className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 flex-shrink-0" />
      <span className="text-[10px] sm:text-[11px] md:text-xs mt-0.5 font-semibold leading-tight text-center truncate w-full">{label}</span>
    </button>
  )
}
