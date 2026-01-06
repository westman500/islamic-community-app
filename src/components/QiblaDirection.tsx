import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Compass } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { Geolocation } from '@capacitor/geolocation'

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
  const [compassAvailable, setCompassAvailable] = useState<boolean>(true)
  const [compassAccuracy, setCompassAccuracy] = useState<number | null>(null)
  const compassRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())
  const smoothingFactor = 0.15 // Balanced smoothness and responsiveness

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

  // Request location and compass permission on component mount
  useEffect(() => {
    requestPermission()
  }, [])

  // Get user location using Capacitor Geolocation
  const getLocation = async () => {
    setLoading(true)
    setError('')

    try {
      // Request permission first
      const permission = await Geolocation.requestPermissions()
      
      if (permission.location === 'denied') {
        setError('Location permission denied. Please enable location access in Settings > Masjid > Location')
        setLoading(false)
        return
      }

      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      })

      const { latitude, longitude } = position.coords
      setLocation({ latitude, longitude })
      const qibla = calculateQibla(latitude, longitude)
      setQiblaDirection(qibla)
      setLoading(false)
    } catch (err: any) {
      let errorMessage = 'Location error: '
      if (err.message) {
        errorMessage += err.message
      } else {
        errorMessage += 'Unable to get your location. Please check your GPS/location services.'
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Watch device orientation with real-time smooth updates
  useEffect(() => {
    if (!permissionGranted) return

    let latestHeading = compassRef.current
    let isAnimating = true
    let useAbsolute = false

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Skip if we're using absolute orientation
      if (useAbsolute) return
      
      if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
        lastUpdateRef.current = Date.now()
        let heading = event.alpha || 0
        
        // PRIORITY 1: Samsung/Android webkitCompassHeading (most accurate for Samsung A06)
        const webkitEvent = event as any
        if (webkitEvent.webkitCompassHeading !== undefined && webkitEvent.webkitCompassHeading !== null) {
          // webkitCompassHeading gives direct magnetic north heading (0-360)
          heading = 360 - webkitEvent.webkitCompassHeading
          
          // webkitCompassAccuracy provides accuracy in degrees
          if (webkitEvent.webkitCompassAccuracy !== undefined) {
            setCompassAccuracy(webkitEvent.webkitCompassAccuracy)
          }
          console.log('Using webkitCompassHeading:', heading)
        } else if (event.alpha !== null) {
          // PRIORITY 2: Standard alpha orientation
          // Alpha is 0 when device points to magnetic north, increases clockwise
          heading = 360 - event.alpha
          console.log('Using standard alpha:', heading)
        }
        
        // Store the latest heading from sensor
        latestHeading = heading
        setCompassAvailable(true)
      }
    }

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      // Use absolute orientation if available (provides true north on supported devices)
      // This works better on Samsung and newer Android devices
      if (event.absolute && event.alpha !== null) {
        lastUpdateRef.current = Date.now()
        useAbsolute = true
        let heading = event.alpha
        
        // For absolute orientation, alpha is 0 at north, increases clockwise
        // Samsung phones typically use this
        heading = (360 - heading) % 360
        
        latestHeading = heading
        setCompassAvailable(true)
      }
    }
    
    // Check if compass is actually working by monitoring updates
    const compassCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
      // If no updates in 3 seconds, compass may not be working
      if (timeSinceLastUpdate > 3000 && permissionGranted) {
        setCompassAvailable(false)
      }
    }, 3000)

    // Smooth animation loop using requestAnimationFrame for real-time updates
    const animate = () => {
      if (!isAnimating) return

      // Calculate shortest path between current and target heading
      let diff = latestHeading - compassRef.current
      
      // Normalize difference to -180 to 180 range (shortest rotation)
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      
      // Apply exponential smoothing for smooth motion
      compassRef.current += diff * smoothingFactor
      
      // Normalize to 0-360 range
      compassRef.current = (compassRef.current + 360) % 360
      
      // Update React state (throttled to avoid too many re-renders)
      setDeviceHeading(compassRef.current)
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true)
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true)
      
      // Start animation loop
      animate()
    }

    return () => {
      isAnimating = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (compassCheckInterval) {
        clearInterval(compassCheckInterval)
      }
      window.removeEventListener('deviceorientation', handleOrientation, true)
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true)
    }
  }, [permissionGranted])

  // Request device orientation permission (iOS 13+)
  const requestPermission = async () => {
    setError('')
    setLoading(true)
    
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS 13+ requires explicit permission
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === 'granted') {
          setPermissionGranted(true)
          getLocation()
        } else {
          setError('Compass permission denied. Please enable motion & orientation access in your device settings.')
          setLoading(false)
        }
      } catch (err) {
        setError('Unable to access device compass. Please check your browser settings.')
        setLoading(false)
      }
    } else {
      // Android/Samsung and other devices that don't require explicit permission
      // Check if device orientation is actually supported
      if (window.DeviceOrientationEvent) {
        // Test if we can get orientation events
        const testHandler = (event: DeviceOrientationEvent) => {
          if (event.alpha !== null || (event as any).webkitCompassHeading !== undefined) {
            setPermissionGranted(true)
            getLocation()
            window.removeEventListener('deviceorientation', testHandler)
            window.removeEventListener('deviceorientationabsolute', testHandler as any)
          }
        }
        
        window.addEventListener('deviceorientation', testHandler)
        window.addEventListener('deviceorientationabsolute', testHandler as any)
        
        // Fallback: if no event fires within 2 seconds, assume it's available anyway
        setTimeout(() => {
          window.removeEventListener('deviceorientation', testHandler)
          window.removeEventListener('deviceorientationabsolute', testHandler as any)
          if (!permissionGranted) {
            setPermissionGranted(true)
            getLocation()
          }
        }, 2000)
      } else {
        setError('Device orientation not supported on this device. Compass features require a device with gyroscope/magnetometer sensors.')
      }
    }
  }

  const relativeQibla = qiblaDirection - deviceHeading

  return (
    <MobileLayout title="Qibla Direction">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Qibla Direction</CardTitle>
        </CardHeader>
        <CardContent style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
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
                {loading ? 'Requesting Permission...' : 'Show Compass'}
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
                <p className="text-sm font-semibold mb-2">📍 All Devices:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click "Allow" when browser asks for location permission</li>
                  <li>Make sure location services are enabled on your device</li>
                  <li>Works best on mobile devices with compass sensor</li>
                  <li>Tablets/desktops show static direction (no live compass)</li>
                  <li>Keep away from magnets, metal objects, and electronics</li>
                </ul>
              </div>
              <div className="mt-4 text-left bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm font-semibold mb-2 text-amber-800">📱 Android/Samsung:</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Calibrate: Move device in figure-8 pattern (∞) in the air</li>
                  <li>Settings → Display → Enable "Motion sensors"</li>
                  <li>Chrome: Settings → Site settings → Permissions → Motion sensors</li>
                  <li>Disable battery optimization for browser app</li>
                  <li>Try in open area away from metal structures</li>
                </ul>
              </div>
              <div className="mt-4 text-left bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold mb-2 text-purple-800">🍎 iOS/iPhone:</p>
                <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                  <li>Settings → Privacy → Motion & Orientation → Enable for Safari/Chrome</li>
                  <li>Settings → Compass → Enable "Use True North"</li>
                  <li>Calibrate by tilting screen to complete red circle</li>
                  <li>Works best in Safari browser</li>
                  <li>May need to tap "Allow" multiple times</li>
                </ul>
              </div>
              <div className="mt-4 text-left bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm font-semibold mb-2 text-green-800">🌐 Other Browsers:</p>
                <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                  <li>Chrome/Edge: Works on most devices</li>
                  <li>Firefox: May need to enable motion sensors in settings</li>
                  <li>Samsung Internet: Usually works well</li>
                  <li>Opera: Enable device sensors in site settings</li>
                  <li>If stuck, try different browser or use static mode</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Compass Status Indicator */}
              {!compassAvailable && (
                <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    ⚠️ Compass sensor not detected
                  </p>
                  <p className="text-xs text-yellow-700">
                    Your device may not have a magnetometer, or the sensor is disabled. You can still see the static Qibla direction below.
                  </p>
                </div>
              )}
              
              {compassAvailable && compassAccuracy && compassAccuracy > 30 && (
                <div className="bg-orange-50 border border-orange-300 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-orange-800 mb-1">
                    🔄 Low compass accuracy
                  </p>
                  <p className="text-xs text-orange-700">
                    Move your phone in a figure-8 pattern to calibrate the compass sensor.
                  </p>
                </div>
              )}
              
              {compassAvailable && (!compassAccuracy || compassAccuracy <= 15) && (
                <div className="bg-green-50 border border-green-300 p-2 rounded-lg">
                  <p className="text-xs font-semibold text-green-800">
                    ✅ Compass working {compassAccuracy ? `(±${compassAccuracy.toFixed(0)}°)` : ''}
                  </p>
                </div>
              )}
              
              {/* Compass Display */}
              <div className="relative w-72 h-72 mx-auto">
                {/* Compass ring with cardinal directions */}
                <div
                  className={`absolute inset-0 rounded-full border-8 bg-gradient-to-br from-emerald-50 to-white shadow-xl ${
                    compassAvailable ? 'border-emerald-600' : 'border-gray-400'
                  }`}
                  style={{
                    transform: compassAvailable ? `rotate(${-deviceHeading}deg)` : 'rotate(0deg)',
                    transition: compassAvailable ? 'none' : 'transform 0.5s ease', // Smooth on static, instant on live
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
                    transition: 'none', // Remove transition for real-time updates
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
                
                {compassAvailable ? (
                  <div className="bg-blue-50 p-3 rounded-lg mt-4">
                    <p className="text-sm font-medium text-blue-800">
                      🧭 Rotate your device until the green arrow points upward
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Keep device flat and away from metal objects
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg mt-4 border border-gray-300">
                    <p className="text-sm font-medium text-gray-800">
                      📍 Static Direction (No Compass)
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Face {qiblaDirection.toFixed(1)}° from North to face Qibla. The arrow above shows the direction.
                    </p>
                  </div>
                )}
                
                {compassAvailable && (
                  <div className="bg-amber-50 p-3 rounded-lg mt-2 border border-amber-200">
                    <p className="text-xs font-medium text-amber-800 mb-1">
                      🔄 Compass not accurate? Calibrate it:
                    </p>
                    <p className="text-xs text-amber-700">
                      Move your phone in a figure-8 pattern (∞) in the air a few times. This recalibrates the magnetometer sensor.
                    </p>
                  </div>
                )}
                
                {!compassAvailable && (
                  <div className="bg-purple-50 p-3 rounded-lg mt-2 border border-purple-200">
                    <p className="text-xs font-medium text-purple-800 mb-1">
                      💡 Using manual compass:
                    </p>
                    <p className="text-xs text-purple-700">
                      Use a physical compass or compass app to find North, then rotate {qiblaDirection.toFixed(1)}° clockwise to face Qibla.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button onClick={requestPermission} variant="outline" className="w-full">
                  {compassAvailable ? 'Recalibrate Compass' : 'Retry Compass Detection'}
                </Button>
                
                {!compassAvailable && (
                  <p className="text-xs text-center text-muted-foreground">
                    This device may not have a magnetometer sensor. Using static direction mode.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MobileLayout>
  )
}
