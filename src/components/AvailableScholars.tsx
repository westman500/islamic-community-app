import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { supabase } from '../utils/supabase/client'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Video, MessageCircle, Star, User } from 'lucide-react'
import { MobileLayout } from './MobileLayout'

interface Scholar {
  id: string
  full_name: string
  role: string
  bio: string | null
  specializations: string[] | null
  average_rating: number
  total_ratings: number
  certificate_verified: boolean
  is_online: boolean
}

export const AvailableScholars: React.FC = () => {
  const navigate = useNavigate()
  const [scholars, setScholars] = useState<Scholar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'online' | 'verified'>('all')

  useEffect(() => {
    fetchScholars()
  }, [filter])

  const fetchScholars = async () => {
    try {
      setLoading(true)
      setError('')

      let query = supabase
        .from('profiles')
        .select('*')
        .in('role', ['scholar', 'imam'])

      if (filter === 'verified') {
        query = query.eq('certificate_verified', true)
      } else if (filter === 'online') {
        // For now, show all. Later implement real-time presence
        query = query.eq('certificate_verified', true)
      }

      const { data, error: fetchError } = await query
        .order('average_rating', { ascending: false })

      if (fetchError) throw fetchError

      setScholars(data || [])
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching scholars:', err)
      setError('Failed to load scholars. Please try again.')
      setLoading(false)
    }
  }

  const handleBookConsultation = (scholarId: string) => {
    navigate(`/book-consultation?scholar=${scholarId}`)
  }

  return (
    <MobileLayout title="Available Scholars" showBack>
      <div className="p-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-emerald-600' : ''}
          >
            All Scholars
          </Button>
          <Button
            variant={filter === 'verified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('verified')}
            className={filter === 'verified' ? 'bg-emerald-600' : ''}
          >
            Verified Only
          </Button>
          <Button
            variant={filter === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('online')}
            className={filter === 'online' ? 'bg-emerald-600' : ''}
          >
            Online Now
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading scholars...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchScholars}>Retry</Button>
          </div>
        ) : scholars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No scholars available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scholars.map((scholar) => (
              <Card key={scholar.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">{scholar.full_name}</h3>
                        {scholar.certificate_verified && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{scholar.role}</p>
                    </div>
                    {scholar.average_rating > 0 && (
                      <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold">{scholar.average_rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({scholar.total_ratings})</span>
                      </div>
                    )}
                  </div>

                  {scholar.bio && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{scholar.bio}</p>
                  )}

                  {scholar.specializations && scholar.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {scholar.specializations.slice(0, 3).map((spec, index) => (
                        <span
                          key={index}
                          className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleBookConsultation(scholar.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                    <Button
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => navigate(`/livestreams?scholar=${scholar.id}`)}
                    >
                      <Video className="h-4 w-4 mr-1" />
                      Stream
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/scholar/${scholar.id}`)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
