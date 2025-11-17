import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Compass } from 'lucide-react'
import { MobileLayout } from './MobileLayout'

interface Location {
  latitude: number
  longitude: number
}

export const QiblaDirection: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null)
  const [qiblaDirection, setQiblaDirection] = useState<number>(0)
  const [deviceHeading, setDeviceHeading] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const compassRef = useRef<number>(0)
  const smoothingFactor = 0.1 // Lower = smoother but slower response

  // Kaaba coordinates (precise location)
  const KAABA = { latitude: 21.422487, longitude: 39.826206 }

  // Calculate Qibla direction using accurate formula
  const calculateQibla = (lat: number, lon: number): number => {
    const lat1 = (lat * Math.PI) / 180
    const lon1 = (lon * Math.PI) / 180
    const lat2 = (KAABA.latitude * Math.PI) / 180
    const lon2 = (KAABA.longitude * Math.PI) / 180

    const dLon = lon2 - lon1

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x =
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    let bearing = Math.atan2(y, x)
    bearing = (bearing * 180) / Math.PI
    bearing = (bearing + 360) % 360

    return bearing
  }

  // Calculate distance to Makkah using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Get user location
  const getLocation = () => {
    setLoading(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        const qibla = calculateQibla(latitude, longitude)
        setQiblaDirection(qibla)
        setLoading(false)
      },
      (err) => {
        setError(`Error: ${err.message}`)
        setLoading(false)
      }
    )
  }

  // Watch device orientation with smoothing
  useEffect(() => {
    if (!permissionGranted) return

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        // Get compass heading (alpha)
        let heading = event.alpha
        
        // On Android, alpha is measured from magnetic north
        // On iOS, it's from true north
        // Adjust for magnetic declination if needed
        
        // Convert to 0-360 range
        heading = (360 - heading) % 360
        
        // Apply exponential smoothing to reduce jitter
        compassRef.current = compassRef.current + smoothingFactor * (heading - compassRef.current)
        
        setDeviceHeading(compassRef.current)
      }
    }

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      // Use absolute orientation if available (provides true north on supported devices)
      if (event.absolute && event.alpha !== null) {
        let heading = (360 - event.alpha) % 360
        compassRef.current = compassRef.current + smoothingFactor * (heading - compassRef.current)
        setDeviceHeading(compassRef.current)
      }
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true)
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true)
    }
  }, [permissionGranted])

  // Request device orientation permission (iOS 13+)
  const requestPermission = async () => {
    setError('')
    
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === 'granted') {
          setPermissionGranted(true)
          getLocation()
        } else {
          setError('Compass permission denied. Please enable motion & orientation access in your device settings.')
        }
      } catch (err) {
        setError('Unable to access device compass. Please check your browser settings.')
      }
    } else {
      // Android and other devices that don't require permission
      setPermissionGranted(true)
      getLocation()
    }
  }

  const relativeQibla = qiblaDirection - deviceHeading

  return (
    <MobileLayout title="Qibla Direction">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Qibla Direction</CardTitle>
        </CardHeader>
        <CardContent>
          {!location ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <Compass className="h-16 w-16 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Click the button below and allow location access when prompted
              </p>
              <Button 
                onClick={requestPermission} 
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Getting Location...' : 'Show Compass'}
              </Button>
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure you allow location access in your browser settings
                  </p>
                </div>
              )}
              <div className="mt-6 text-left bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">📍 Tips:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click "Allow" when browser asks for location permission</li>
                  <li>Make sure location services are enabled on your device</li>
                  <li>Works best on mobile devices with compass sensor</li>
                  <li>On desktop, you'll see the calculated direction only</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Compass Display */}
              <div className="relative w-72 h-72 mx-auto">
                {/* Compass ring with cardinal directions */}
                <div
                  className="absolute inset-0 rounded-full border-8 border-emerald-600 bg-gradient-to-br from-emerald-50 to-white shadow-xl"
                  style={{
                    transform: `rotate(${-deviceHeading}deg)`,
                    transition: 'transform 0.05s linear',
                  }}
                >
                  {/* Cardinal directions */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-lg font-bold text-red-600">
                    N
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-600">
                    E
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-base font-bold text-gray-600">
                    S
                  </div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-600">
                    W
                  </div>
                  
                  {/* Degree markers */}
                  {[...Array(36)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-2 left-1/2 -translate-x-1/2 origin-bottom h-32"
                      style={{
                        transform: `translateX(-50%) rotate(${i * 10}deg)`,
                      }}
                    >
                      <div className={`w-0.5 ${i % 3 === 0 ? 'h-3 bg-emerald-600' : 'h-2 bg-emerald-400'}`} />
                    </div>
                  ))}
                </div>

                {/* Qibla direction with Kaaba icon pointing to Makkah */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `rotate(${relativeQibla}deg)`,
                    transition: 'transform 0.05s linear',
                  }}
                >
                  <div className="relative">
                    {/* Kaaba/Mosque Icon SVG */}
                    <svg
                      width="120"
                      height="120"
                      viewBox="0 0 120 120"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-2xl"
                    >
                      {/* Arrow pointing upward */}
                      <path
                        d="M60 10 L80 40 L70 40 L70 70 L50 70 L50 40 L40 40 Z"
                        fill="#10b981"
                        stroke="#059669"
                        strokeWidth="2"
                      />
                      {/* Kaaba cube */}
                      <rect
                        x="40"
                        y="75"
                        width="40"
                        height="30"
                        fill="#1f2937"
                        stroke="#374151"
                        strokeWidth="2"
                      />
                      {/* Gold band on Kaaba */}
                      <rect
                        x="40"
                        y="85"
                        width="40"
                        height="8"
                        fill="#fbbf24"
                        opacity="0.8"
                      />
                      {/* Door */}
                      <rect
                        x="52"
                        y="92"
                        width="16"
                        height="13"
                        fill="#78350f"
                        stroke="#92400e"
                        strokeWidth="1"
                      />
                    </svg>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-lg">
                        🕋 Makkah
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-600 shadow-lg border-2 border-white" />
              </div>

              {/* Information */}
              <div className="text-center space-y-3 mt-6">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-800">
                    {qiblaDirection.toFixed(1)}°
                  </p>
                  <p className="text-sm text-emerald-600">Qibla Direction from North</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold text-gray-700">Your Heading</p>
                    <p className="text-gray-600">{deviceHeading.toFixed(1)}°</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold text-gray-700">Distance</p>
                    <p className="text-gray-600">{Math.round(calculateDistance(location.latitude, location.longitude, KAABA.latitude, KAABA.longitude))} km</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                </p>
                
                <div className="bg-blue-50 p-3 rounded-lg mt-4">
                  <p className="text-sm font-medium text-blue-800">
                    🧭 Rotate your device until the green arrow points upward
                  </p>
                </div>
              </div>

              <Button onClick={requestPermission} variant="outline" className="w-full mt-4">
                Recalibrate Compass
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </MobileLayout>
  )
}
