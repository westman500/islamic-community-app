import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate()
  const termsUrl = 'https://petal-salto-1a6.notion.site/MASJID-PRIVACY-POLICY-TERMS-OF-SERVICE-END-USER-LICENSE-AGREEMENT-EULA-2cd859eb5c00806a9948eb3d1695f9dc'

  useEffect(() => {
    // On mobile, open in system browser and go back
    const openExternally = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: termsUrl })
        } catch {
          window.open(termsUrl, '_system')
        }
        navigate(-1)
      } else {
        // On web, open in new tab and go back
        window.open(termsUrl, '_blank')
        navigate(-1)
      }
    }
    openExternally()
  }, [navigate])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-emerald-600">Opening Terms of Service...</p>
      </div>
    </div>
  )
}
