import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Clock } from 'lucide-react'

interface PrayerTime {
  name: string
  time: string
  arabic: string
}

export const CompactPrayerTimes: React.FC = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([])

  const [currentPrayer, setCurrentPrayer] = useState<string>('')
  const [nextPrayer, setNextPrayer] = useState<string>('')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPrayerTimes()
    const interval = setInterval(() => {
      updateCurrentPrayer()
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Auto-slide every 3 seconds
    if (prayerTimes.length > 0) {
      const totalSlides = prayerTimes.length + 1 // +1 for Jummah
      const slideInterval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides)
      }, 3000)

      return () => clearInterval(slideInterval)
    }
  }, [prayerTimes.length])

  const fetchPrayerTimes = async () => {
    try {
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            await getPrayerTimesByCoords(latitude, longitude)
          },
          () => {
            // Fallback to default location
            getPrayerTimesByCity('Lagos', 'NG')
          }
        )
      } else {
        getPrayerTimesByCity('Lagos', 'NG')
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error)
    }
  }

  const getPrayerTimesByCoords = async (lat: number, lon: number) => {
    try {
      const today = new Date()
      const timestamp = Math.floor(today.getTime() / 1000)
      
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=2`
      )
      const data = await response.json()
      
      if (data.code === 200) {
        parsePrayerTimes(data.data)
        setLocation(`${data.data.meta.timezone}`)
      }
    } catch (error) {
      console.error('Error fetching prayer times by coords:', error)
    }
  }

  const getPrayerTimesByCity = async (city: string, country: string) => {
    try {
      const today = new Date()
      const day = today.getDate()
      const month = today.getMonth() + 1
      const year = today.getFullYear()
      
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${city}&country=${country}&method=2`
      )
      const data = await response.json()
      
      if (data.code === 200) {
        parsePrayerTimes(data.data)
        setLocation(`${city}, ${country}`)
      }
    } catch (error) {
      console.error('Error fetching prayer times by city:', error)
    }
  }

  const parsePrayerTimes = (data: any) => {
    const times = data.timings
    const prayers: PrayerTime[] = [
      { name: 'Fajr', time: times.Fajr, arabic: 'الفجر' },
      { name: 'Dhuhr', time: times.Dhuhr, arabic: 'الظهر' },
      { name: 'Asr', time: times.Asr, arabic: 'العصر' },
      { name: 'Maghrib', time: times.Maghrib, arabic: 'المغرب' },
      { name: 'Isha', time: times.Isha, arabic: 'العشاء' },
    ]
    
    setPrayerTimes(prayers)
    updateCurrentPrayer(prayers)
    setIsLoading(false)
  }

  const updateCurrentPrayer = (prayers: PrayerTime[] = prayerTimes) => {
    if (prayers.length === 0) return

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    for (let i = 0; i < prayers.length; i++) {
      const [hours, minutes] = prayers[i].time.split(':').map(Number)
      const prayerTime = hours * 60 + minutes

      if (currentTime < prayerTime) {
        setNextPrayer(prayers[i].name)
        if (i > 0) {
          setCurrentPrayer(prayers[i - 1].name)
        } else {
          setCurrentPrayer('Isha') // Before Fajr, current is Isha
        }
        return
      }
    }

    // After Isha
    setCurrentPrayer('Isha')
    setNextPrayer('Fajr')
  }

  const isPrayerNext = (prayerName: string) => prayerName === nextPrayer
  const isPrayerCurrent = (prayerName: string) => prayerName === currentPrayer

  // Add Jummah to the carousel
  const allPrayers = [...prayerTimes, { name: "Jumu'ah", time: '1:30 PM', arabic: 'الجمعة' }]

  return (
    <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h3 className="font-bold text-sm">Prayer Times</h3>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full"></div>
          </div>
        ) : (
        /* Carousel Container - Seamless auto-sliding */
        <div className="relative overflow-hidden h-20">
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {allPrayers.map((prayer, index) => (
              <div
                key={index}
                className="min-w-full flex items-center justify-center"
              >
                <div className={`text-center p-2 rounded-lg w-full ${
                  prayer.name === "Jumu'ah"
                    ? 'bg-green-500/30 border border-green-300'
                    : isPrayerNext(prayer.name)
                    ? 'bg-amber-500/30 border border-amber-300'
                    : isPrayerCurrent(prayer.name)
                    ? 'bg-emerald-800/50'
                    : 'bg-white/10'
                }`}>
                  <div className="text-xs font-bold mb-0.5">{prayer.arabic}</div>
                  <div className="text-sm font-semibold mb-0.5">{prayer.name}</div>
                  <div className="text-lg font-bold">{prayer.time}</div>
                  {prayer.name === "Jumu'ah" && (
                    <div className="text-xs mt-0.5 opacity-75">Every Friday</div>
                  )}
                  {isPrayerNext(prayer.name) && prayer.name !== "Jumu'ah" && (
                    <div className="text-xs mt-0.5 font-semibold">🔔 Next</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

      </CardContent>
    </Card>
  )
}
