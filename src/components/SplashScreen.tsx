import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export function SplashScreen() {
  const navigate = useNavigate()
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Start fade out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2000)

    // Hide and navigate after fade completes
    const hideTimer = setTimeout(() => {
      setShow(false)
      navigate('/landing')
    }, 2800)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [navigate])

  if (!show) return null

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex flex-col items-center justify-center z-[9999] transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }}></div>
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Logo with glow effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-300/50 rounded-2xl blur-2xl animate-pulse"></div>
          <img
            src="/masjid-logo.png"
            alt="Masjid"
            className="relative h-32 w-auto drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
              animation: 'fadeIn 1s ease-in-out, float 3s ease-in-out infinite'
            }}
          />
        </div>

        {/* App name */}
        <div className="text-center space-y-2" style={{ animation: 'fadeIn 1s ease-in-out 0.3s backwards' }}>
          <h1
            className="text-5xl font-bold text-white tracking-wider drop-shadow-lg"
            style={{
              fontFamily: '"Amiri", "Arabic Typesetting", serif',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
            }}
          >
            مسجد
          </h1>
          <p className="text-xl text-emerald-100 font-medium tracking-wide">
            Islamic Community App
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex space-x-2 mt-8">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Islamic greeting */}
      <div className="absolute bottom-12 text-center px-6">
        <p className="text-emerald-100 text-sm opacity-80">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-white/70 text-xs mt-2">
          In the name of Allah, the Most Gracious, the Most Merciful
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
