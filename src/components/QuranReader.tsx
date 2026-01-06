import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { MobileLayout } from './MobileLayout'

interface Ayah {
  number: number
  text: string
  numberInSurah: number
  audio: string
  translation: string
}

interface Surah {
  number: number
  name: string
  englishName: string
  numberOfAyahs: number
  revelationType: string
}

export const QuranReader: React.FC = () => {
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [selectedSurah, setSelectedSurah] = useState<number>(1)
  const [ayahs, setAyahs] = useState<Ayah[]>([])
  const [currentAyah, setCurrentAyah] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranslation, setShowTranslation] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Fetch surahs list
  useEffect(() => {
    fetch('https://api.alquran.cloud/v1/surah')
      .then((res) => res.json())
      .then((data) => {
        setSurahs(data.data)
      })
      .catch((err) => console.error('Error fetching surahs:', err))
  }, [])

  // Fetch ayahs when surah changes
  useEffect(() => {
    if (selectedSurah) {
      Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}`).then((r) => r.json()),
        fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/en.asad`).then((r) =>
          r.json()
        ),
        fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/ar.alafasy`).then((r) =>
          r.json()
        ),
      ])
        .then(([arabic, translation, audio]) => {
          const combinedAyahs = arabic.data.ayahs.map((ayah: any, index: number) => ({
            number: ayah.number,
            text: ayah.text,
            numberInSurah: ayah.numberInSurah,
            audio: audio.data.ayahs[index]?.audio || '',
            translation: translation.data.ayahs[index]?.text || '',
          }))
          setAyahs(combinedAyahs)
          setCurrentAyah(0)
        })
        .catch((err) => console.error('Error fetching ayahs:', err))
    }
  }, [selectedSurah])

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current && ayahs[currentAyah]?.audio) {
      audioRef.current.src = ayahs[currentAyah].audio
      if (isPlaying) {
        audioRef.current.play()
      }
    }
  }, [currentAyah, ayahs])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleAudioEnded = () => {
    if (currentAyah < ayahs.length - 1) {
      setCurrentAyah(currentAyah + 1)
    } else {
      setIsPlaying(false)
    }
  }

  const nextAyah = () => {
    if (currentAyah < ayahs.length - 1) {
      setCurrentAyah(currentAyah + 1)
    }
  }

  const prevAyah = () => {
    if (currentAyah > 0) {
      setCurrentAyah(currentAyah - 1)
    }
  }

  return (
    <MobileLayout title="Quran Reader">
      <div className="max-w-4xl mx-auto px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl md:text-3xl">القرآن الكريم - Holy Quran</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Surah selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Surah:</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedSurah}
              onChange={(e) => setSelectedSurah(Number(e.target.value))}
            >
              {surahs.map((surah) => (
                <option key={surah.number} value={surah.number}>
                  {surah.number}. {surah.englishName} ({surah.name})
                </option>
              ))}
            </select>
          </div>

          {/* Audio player controls */}
          <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-secondary rounded-lg">
            <Button variant="outline" size="icon" onClick={prevAyah} disabled={currentAyah === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextAyah}
              disabled={currentAyah === ayahs.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Ayah {currentAyah + 1} / {ayahs.length}
            </span>
          </div>

          <audio ref={audioRef} onEnded={handleAudioEnded} />

          {/* Toggle translation button */}
          <div className="mb-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
            >
              {showTranslation ? 'Hide' : 'Show'} Translation
            </Button>
          </div>

          {/* Ayahs display */}
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {ayahs.map((ayah, index) => (
              <div
                key={ayah.number}
                className={`p-4 rounded-lg border ${
                  index === currentAyah ? 'bg-primary/10 border-primary' : 'bg-card'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-muted-foreground">
                    Ayah {ayah.numberInSurah}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentAyah(index)
                      setIsPlaying(true)
                    }}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-right text-2xl leading-loose mb-4 font-arabic">{ayah.text}</p>
                {showTranslation && (
                  <p className="text-sm text-muted-foreground italic">{ayah.translation}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </MobileLayout>
  )
}
