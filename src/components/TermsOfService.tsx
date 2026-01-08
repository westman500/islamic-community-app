import React from 'react'
import { Button } from './ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate()
  const termsUrl = 'https://petal-salto-1a6.notion.site/MASJID-PRIVACY-POLICY-TERMS-OF-SERVICE-END-USER-LICENSE-AGREEMENT-EULA-2cd859eb5c00806a9948eb3d1695f9dc?source=copy_link'

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 z-50 shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-emerald-500 mr-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold text-white">Terms of Service</h1>
          </div>
          <a
            href={termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-white hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open in new tab</span>
          </a>
        </div>
      </div>

      <div className="flex-1 w-full" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }}>
        <iframe
          src={termsUrl}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 80px)' }}
          title="Terms of Service"
        />
      </div>
    </div>
  )
}
