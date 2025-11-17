import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export function SplashScreen() {
  const navigate = useNavigate()
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
      navigate('/signin')
    }, 2500)

    return () => clearTimeout(timer)
  }, [navigate])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800 flex flex-col items-center justify-center z-50 animate-fade-in">
      <div className="text-white text-center space-y-6 animate-scale-in">
        {/* Logo/Icon */}
        <div className="bg-white rounded-full p-8 shadow-2xl mx-auto w-32 h-32 flex items-center justify-center">
          <Building2 className="h-16 w-16 text-emerald-600" />
        </div>

        {/* App Name */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Masjid</h1>
          <p className="text-emerald-100 text-lg">Islamic Community App</p>
        </div>

        {/* Tagline */}
        <p className="text-emerald-200 text-sm px-8">
          "And establish prayer and give zakah" - Quran 2:43
        </p>

        {/* Loading indicator */}
        <div className="flex justify-center space-x-2 pt-8">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}
