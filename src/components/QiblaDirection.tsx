import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Compass } from 'lucide-react'

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

  // Kaaba coordinates
  const KAABA = { latitude: 21.4225, longitude: 39.8262 }

  // Calculate Qibla direction
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

  // Watch device orientation
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        // alpha is the compass heading
        setDeviceHeading(360 - event.alpha)
      }
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  // Request device orientation permission (iOS 13+)
  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === 'granted') {
          getLocation()
        }
      } catch (err) {
        setError('Permission denied for device orientation')
      }
    } else {
      getLocation()
    }
  }

  const relativeQibla = qiblaDirection - deviceHeading

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Qibla Direction</CardTitle>
        </CardHeader>
        <CardContent>
          {!location ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Allow location access to find the Qibla direction
              </p>
              <Button onClick={requestPermission} disabled={loading}>
                {loading ? 'Getting Location...' : 'Find Qibla Direction'}
              </Button>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Compass Display */}
              <div className="relative w-64 h-64 mx-auto">
                {/* Compass background */}
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary bg-gradient-to-br from-primary/20 to-primary/5"
                  style={{
                    transform: `rotate(${-deviceHeading}deg)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                >
                  {/* Cardinal directions */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-bold">
                    N
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold">
                    E
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold">
                    S
                  </div>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold">
                    W
                  </div>
                </div>

                {/* Qibla arrow */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `rotate(${relativeQibla}deg)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                >
                  <Compass className="h-24 w-24 text-primary" />
                </div>

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary" />
              </div>

              {/* Information */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  Qibla Direction: {qiblaDirection.toFixed(1)}°
                </p>
                <p className="text-sm text-muted-foreground">
                  Your Location: {location.latitude.toFixed(4)}°,{' '}
                  {location.longitude.toFixed(4)}°
                </p>
                <p className="text-sm text-muted-foreground">
                  Device Heading: {deviceHeading.toFixed(1)}°
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Point your device in the direction of the compass arrow to face the Kaaba in
                  Makkah
                </p>
              </div>

              <Button onClick={requestPermission} variant="outline" className="w-full">
                Recalibrate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
