import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Camera, Download, Check } from 'lucide-react'

// App Store Screenshot Sizes
const SCREENSHOT_SIZES = {
  // iPhone 6.7" (iPhone 14 Pro Max, iPhone 15 Pro Max)
  'iPhone 6.7"': { width: 1290, height: 2796, label: 'iPhone 6.7" Display' },
  // iPhone 6.5" (iPhone XS Max, iPhone 11 Pro Max)
  'iPhone 6.5"': { width: 1242, height: 2688, label: 'iPhone 6.5" Display' },
  // iPhone 5.5" (iPhone 8 Plus)
  'iPhone 5.5"': { width: 1242, height: 2208, label: 'iPhone 5.5" Display' },
  // Android Phone (1080p)
  'Android Phone': { width: 1080, height: 1920, label: 'Android 16:9 (1080p)' },
  // Android Tablet (7")
  'Android Tablet 7"': { width: 1200, height: 1920, label: 'Android 7" Tablet' },
  // Android Tablet (10")
  'Android Tablet 10"': { width: 1600, height: 2560, label: 'Android 10" Tablet' },
}

interface ScreenshotConfig {
  name: string
  route: string
  description: string
  category: 'member' | 'scholar' | 'universal'
}

const SCREENSHOT_CONFIGS: ScreenshotConfig[] = [
  // Member Screens
  {
    name: 'Dashboard',
    route: '/',
    description: 'Home dashboard with prayer times and quick access',
    category: 'member'
  },
  {
    name: 'Available Scholars',
    route: '/available-scholars',
    description: 'Browse online scholars and imams',
    category: 'member'
  },
  {
    name: 'Masjid Coin Wallet',
    route: '/masjid-coin',
    description: 'Digital wallet with Paystack integration',
    category: 'member'
  },
  {
    name: 'Consultation Booking',
    route: '/consultation',
    description: 'Book sessions with Islamic scholars',
    category: 'member'
  },
  
  // Scholar Screens
  {
    name: 'Scholar Dashboard',
    route: '/scholar/dashboard',
    description: 'Scholar earnings and upcoming sessions',
    category: 'scholar'
  },
  {
    name: 'Scholar Profile Settings',
    route: '/profile',
    description: 'Set availability, fees, and specializations',
    category: 'scholar'
  },
  {
    name: 'Scholar Wallet',
    route: '/scholar/wallet',
    description: 'Earnings and withdrawal management',
    category: 'scholar'
  },
  {
    name: 'Scholar Livestream',
    route: '/scholar/livestream',
    description: 'Live streaming interface with viewers',
    category: 'scholar'
  },
  
  // Universal Screens
  {
    name: 'Quran Reader',
    route: '/quran',
    description: 'Digital Quran with translations',
    category: 'universal'
  },
  {
    name: 'Prayer Times',
    route: '/prayer-times',
    description: 'Location-based prayer schedule',
    category: 'universal'
  },
  {
    name: 'Qibla Direction',
    route: '/qibla',
    description: 'Compass pointing to Mecca',
    category: 'universal'
  },
  {
    name: 'Zakat Donation',
    route: '/zakat',
    description: 'Islamic charitable giving',
    category: 'universal'
  },
]

export const ScreenshotUtility: React.FC = () => {
  const [capturing, setCapturing] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<keyof typeof SCREENSHOT_SIZES>('Android Phone')
  const [capturedScreens, setCapturedScreens] = useState<Set<string>>(new Set())

  const captureScreen = async (config: ScreenshotConfig, size: keyof typeof SCREENSHOT_SIZES) => {
    try {
      setProgress(`Capturing ${config.name} for ${size}...`)
      
      // Hide the screenshot utility component before capturing
      const utilityElement = document.querySelector('.screenshot-utility-card') as HTMLElement
      const originalDisplay = utilityElement?.style.display || ''
      if (utilityElement) {
        utilityElement.style.display = 'none'
      }
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const element = document.getElementById('app-root') || document.body
      const dimensions = SCREENSHOT_SIZES[size]
      
      // Get actual content height
      const contentHeight = Math.max(
        element.scrollHeight,
        element.offsetHeight,
        document.documentElement.scrollHeight
      )
      
      // Use higher scale for better quality (2x for retina displays)
      const scale = 2

      const canvas = await html2canvas(element, {
        width: dimensions.width,
        height: Math.min(dimensions.height, contentHeight * (dimensions.width / window.innerWidth)),
        scale: scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: dimensions.width,
        windowHeight: dimensions.height,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        imageTimeout: 0,
        foreignObjectRendering: false,
        removeContainer: true,
      })

      // Show the screenshot utility component again
      if (utilityElement) {
        utilityElement.style.display = originalDisplay || 'block'
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return
        
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const fileName = `${config.name.replace(/\s+/g, '_')}_${size.replace(/["\s]/g, '_')}.png`
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
        
        setCapturedScreens(prev => new Set(prev).add(`${config.name}-${size}`))
        setProgress(`✓ Saved ${fileName}`)
      }, 'image/png', 1.0)

      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error('Screenshot error:', error)
      setProgress(`Error capturing ${config.name}: ${error}`)
    }
  }

  const captureAll = async () => {
    setCapturing(true)
    setCapturedScreens(new Set())
    
    for (const config of SCREENSHOT_CONFIGS) {
      await captureScreen(config, selectedSize)
    }
    
    setProgress('✓ All screenshots captured!')
    setCapturing(false)
  }

  const captureCurrent = async () => {
    setCapturing(true)
    const currentPath = window.location.pathname
    const config = SCREENSHOT_CONFIGS.find(c => c.route === currentPath) || {
      name: 'Current_Screen',
      route: currentPath,
      description: 'Current view',
      category: 'universal' as const
    }
    
    await captureScreen(config, selectedSize)
    setCapturing(false)
  }

  const isCaptured = (name: string) => capturedScreens.has(`${name}-${selectedSize}`)
  
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <Card className={`screenshot-utility-card fixed right-4 shadow-xl z-50 bg-white/95 backdrop-blur transition-all ${isMinimized ? 'w-12' : 'w-96'}`} style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <CardHeader className="cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Camera className="h-4 w-4" />
          {!isMinimized && 'Screenshot Utility'}
        </CardTitle>
      </CardHeader>
      {!isMinimized && (<CardContent className="space-y-4">
        {/* Size Selector */}
        <div>
          <label className="text-xs font-medium mb-2 block">Target Size:</label>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value as keyof typeof SCREENSHOT_SIZES)}
            className="w-full p-2 border rounded text-sm"
            disabled={capturing}
          >
            {Object.entries(SCREENSHOT_SIZES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label} ({value.width}×{value.height})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={captureCurrent}
            disabled={capturing}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-1" />
            Current
          </Button>
          <Button
            onClick={captureAll}
            disabled={capturing}
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-1" />
            All Screens
          </Button>
        </div>

        {/* Progress */}
        {progress && (
          <div className="text-xs p-2 bg-gray-100 rounded">
            {progress}
          </div>
        )}

        {/* Screen List */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          <div className="text-xs font-medium mb-2">Screens to capture:</div>
          {SCREENSHOT_CONFIGS.map((config) => (
            <div
              key={config.name}
              className="flex items-center justify-between p-2 text-xs bg-gray-50 rounded"
            >
              <div>
                <div className="font-medium">{config.name}</div>
                <div className="text-gray-500 text-[10px]">{config.description}</div>
              </div>
              {isCaptured(config.name) && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="text-[10px] text-gray-500 border-t pt-2">
          Screenshots will be saved to your Downloads folder. Navigate to each screen manually for best results, or use "All Screens" for automatic capture.
        </div>
      </CardContent>)}
    </Card>
  )
}
