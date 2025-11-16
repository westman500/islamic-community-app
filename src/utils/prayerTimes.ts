import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from 'adhan'
import { format } from 'date-fns'

export interface PrayerTime {
  name: string
  time: Date
  displayTime: string
}

export interface PrayerTimesData {
  fajr: PrayerTime
  sunrise: PrayerTime
  dhuhr: PrayerTime
  asr: PrayerTime
  maghrib: PrayerTime
  isha: PrayerTime
  date: Date
  qiblaDirection: number
}

export const calculatePrayerTimes = (
  latitude: number,
  longitude: number,
  date: Date = new Date()
): PrayerTimesData => {
  const coordinates = new Coordinates(latitude, longitude)
  const params = CalculationMethod.MuslimWorldLeague()
  const prayerTimes = new PrayerTimes(coordinates, date, params)
  const qibla = Qibla(coordinates)

  const formatTime = (time: Date): string => format(time, 'h:mm a')

  return {
    fajr: { name: 'Fajr', time: prayerTimes.fajr, displayTime: formatTime(prayerTimes.fajr) },
    sunrise: { name: 'Sunrise', time: prayerTimes.sunrise, displayTime: formatTime(prayerTimes.sunrise) },
    dhuhr: { name: 'Dhuhr', time: prayerTimes.dhuhr, displayTime: formatTime(prayerTimes.dhuhr) },
    asr: { name: 'Asr', time: prayerTimes.asr, displayTime: formatTime(prayerTimes.asr) },
    maghrib: { name: 'Maghrib', time: prayerTimes.maghrib, displayTime: formatTime(prayerTimes.maghrib) },
    isha: { name: 'Isha', time: prayerTimes.isha, displayTime: formatTime(prayerTimes.isha) },
    date,
    qiblaDirection: qibla,
  }
}

export const getCurrentPrayer = (prayerTimes: PrayerTimesData): string => {
  const now = new Date()
  const times = [
    { name: 'Fajr', time: prayerTimes.fajr.time },
    { name: 'Sunrise', time: prayerTimes.sunrise.time },
    { name: 'Dhuhr', time: prayerTimes.dhuhr.time },
    { name: 'Asr', time: prayerTimes.asr.time },
    { name: 'Maghrib', time: prayerTimes.maghrib.time },
    { name: 'Isha', time: prayerTimes.isha.time },
  ]

  for (let i = 0; i < times.length - 1; i++) {
    if (now >= times[i].time && now < times[i + 1].time) {
      return times[i].name
    }
  }

  return now >= times[times.length - 1].time ? 'Isha' : 'Fajr'
}

export const getNextPrayer = (prayerTimes: PrayerTimesData): PrayerTime | null => {
  const now = new Date()
  const times = [
    prayerTimes.fajr,
    prayerTimes.dhuhr,
    prayerTimes.asr,
    prayerTimes.maghrib,
    prayerTimes.isha,
  ]

  for (const prayer of times) {
    if (now < prayer.time) {
      return prayer
    }
  }

  return null
}
