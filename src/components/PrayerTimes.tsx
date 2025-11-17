import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { calculatePrayerTimes, getCurrentPrayer, getNextPrayer, type PrayerTimesData } from '../utils/prayerTimes'

export const PrayerTimes: React.FC = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Get user location and calculate prayer times
  const getLocationAndPrayerTimes = () => {
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
        const times = calculatePrayerTimes(latitude, longitude)
        setPrayerTimes(times)
        setLoading(false)
      },
      (err) => {
        setError(`Error: ${err.message}`)
        setLoading(false)
      }
    )
  }

  // Auto-load on mount
  useEffect(() => {
    getLocationAndPrayerTimes()
  }, [])

  const currentPrayer = prayerTimes ? getCurrentPrayer(prayerTimes) : null
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    })
  }

  const getTimeUntilNext = () => {
    if (!nextPrayer) return null
    const diff = nextPrayer.time.getTime() - currentTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Prayer Times</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading prayer times...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <p className="text-destructive">{error}</p>
              <Button onClick={getLocationAndPrayerTimes}>Try Again</Button>
            </div>
          ) : !prayerTimes ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Allow location access to see prayer times
              </p>
              <Button onClick={getLocationAndPrayerTimes}>Get Prayer Times</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current time and location */}
              <div className="text-center space-y-2 p-4 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{formatTime(currentTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {location ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°` : ''}
                </p>
                <p className="text-sm">
                  Current: <span className="font-semibold">{currentPrayer}</span>
                </p>
                {nextPrayer && (
                  <p className="text-xs text-muted-foreground">
                    Next: {nextPrayer.name} in {getTimeUntilNext()}
                  </p>
                )}
              </div>

              {/* Prayer times list - Islamic styled */}
              <div className="space-y-3">
                {[
                  { prayer: prayerTimes.fajr, icon: '🌅', arabic: 'الفجر', description: 'Dawn Prayer' },
                  { prayer: prayerTimes.sunrise, icon: '☀️', arabic: 'الشروق', description: 'Sunrise' },
                  { prayer: prayerTimes.dhuhr, icon: '🌤️', arabic: 'الظهر', description: 'Noon Prayer' },
                  { prayer: prayerTimes.asr, icon: '🌆', arabic: 'العصر', description: 'Afternoon Prayer' },
                  { prayer: prayerTimes.maghrib, icon: '🌇', arabic: 'المغرب', description: 'Sunset Prayer' },
                  { prayer: prayerTimes.isha, icon: '🌙', arabic: 'العشاء', description: 'Night Prayer' },
                ].map(({ prayer, icon, arabic, description }) => {
                  const isCurrent = currentPrayer === prayer.name
                  const isNext = nextPrayer?.name === prayer.name
                  
                  return (
                    <div
                      key={prayer.name}
                      className={`relative flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-500 shadow-lg scale-105'
                          : isNext
                          ? 'bg-amber-50 border-amber-400'
                          : 'bg-card border-gray-200'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white animate-pulse">
                            Current Prayer
                          </span>
                        </div>
                      )}
                      {isNext && !isCurrent && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-600 text-white">
                            Next: {getTimeUntilNext()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isCurrent ? 'text-emerald-700 text-lg' : 'text-base'}`}>
                              {prayer.name}
                            </span>
                            <span className="text-sm text-muted-foreground">{description}</span>
                          </div>
                          <p className={`font-arabic text-lg ${isCurrent ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {arabic}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xl font-mono ${isCurrent ? 'text-emerald-700 font-bold' : ''}`}>
                        {prayer.displayTime}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Qibla direction */}
              <div className="text-center p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Qibla Direction</p>
                <p className="text-2xl font-bold">{prayerTimes.qiblaDirection.toFixed(1)}°</p>
              </div>

              <Button onClick={getLocationAndPrayerTimes} variant="outline" className="w-full">
                Refresh Prayer Times
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
