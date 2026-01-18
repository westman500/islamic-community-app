import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Star,
  Phone,
  Globe,
  UtensilsCrossed,
  ChefHat
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

interface Activity {
  id: string
  title: string
  description: string
  category: string
  location: string
  date: string
  time: string
  price: number
  capacity: number
  current_participants: number
  organizer_id: string
  organizer: {
    full_name: string
  }
  options?: ActivityOption[]
}

interface ActivityOption {
  id: string
  name: string
  description: string
  price: number
  available: boolean
}

// Halal restaurants - to be populated from database
const HALAL_RESTAURANTS: Activity[] = []

export const ActivitiesByCategory: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const categoryNames: Record<string, string> = {
    education: 'Islamic Education',
    prayers: 'Prayer Services',
    sports: 'Sports & Fitness',
    social: 'Social Events',
    restaurant: 'Halal Restaurants',
    charity: 'Charity & Volunteering',
    business: 'Business & Career',
    family: 'Family & Youth',
    arts: 'Arts & Culture',
    library: 'Library & Books'
  }

  useEffect(() => {
    fetchActivities()
  }, [categoryId])

  const fetchActivities = async () => {
    try {
      setLoading(true)

      // Special handling for restaurants
      if (categoryId === 'restaurant') {
        setActivities(HALAL_RESTAURANTS as any)
        setLoading(false)
        return
      }

      // Fetch activities from database - simplified query without join
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('category', categoryId)
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching activities:', error)
        setActivities([])
        setLoading(false)
        return
      }

      // Transform data to add organizer placeholder
      const activitiesWithOrganizer = (data || []).map(activity => ({
        ...activity,
        organizer: { full_name: activity.organizer_name || 'Community Organizer' }
      }))

      console.log('Activities fetched for category', categoryId, ':', activitiesWithOrganizer)
      setActivities(activitiesWithOrganizer)
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const handleBookActivity = async (activityId: string) => {
    if (!profile?.id) {
      alert('Please sign in to book activities')
      navigate('/signin')
      return
    }

    try {
      const { error } = await supabase
        .from('activity_bookings')
        .insert({
          activity_id: activityId,
          user_id: profile.id,
          booking_date: new Date().toISOString(),
          status: 'pending'
        })

      if (error) throw error

      alert('Activity booked successfully!')
      navigate('/my-bookings')
    } catch (error: any) {
      console.error('Error booking activity:', error)
      alert(error.message || 'Failed to book activity')
    }
  }

  if (loading) {
    return (
      <MobileLayout title={categoryNames[categoryId || ''] || 'Activities'}>
        <Card>
          <CardContent className="p-6 text-center">
            <p>Loading activities...</p>
          </CardContent>
        </Card>
      </MobileLayout>
    )
  }

  // Restaurant-specific rendering
  if (categoryId === 'restaurant') {
    return (
      <MobileLayout title="Halal Restaurants">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <UtensilsCrossed className="w-12 h-12 text-red-600 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-gray-800">Halal Dining Options</h2>
            <p className="text-sm text-gray-600">Certified halal restaurants in your area</p>
          </div>

          {activities.map((restaurant: any) => (
            <Card key={restaurant.id} className="shadow-md hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-red-600" />
                      {restaurant.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold ml-1">{restaurant.rating}</span>
                      </div>
                      <span className="text-sm text-gray-600">{restaurant.price_range}</span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {restaurant.cuisine}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700">{restaurant.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{restaurant.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{restaurant.hours}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{restaurant.phone}</span>
                  </div>
                  {restaurant.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <a href={`https://${restaurant.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {restaurant.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Menu Options */}
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">Popular Menu Items:</h4>
                  <div className="space-y-2">
                    {restaurant.options?.map((option: ActivityOption) => (
                      <div key={option.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{option.name}</p>
                          <p className="text-xs text-gray-600">{option.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-emerald-600">${option.price}</p>
                          {option.available && (
                            <span className="text-xs text-green-600">Available</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => window.open(`tel:${restaurant.phone}`)}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.location)}`)}
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Directions
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </MobileLayout>
    )
  }

  // Regular activities rendering
  return (
    <MobileLayout title={categoryNames[categoryId || ''] || 'Activities'}>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No activities available in this category yet</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/activity-categories')}
              >
                Browse Other Categories
              </Button>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="shadow-md hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">{activity.title}</CardTitle>
                <p className="text-sm text-gray-600">by {activity.organizer?.full_name || 'Community Organizer'}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700">{activity.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{new Date(activity.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{activity.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{activity.current_participants || 0} / {activity.capacity} participants</span>
                  </div>
                  {activity.price > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-emerald-600">${activity.price}</span>
                    </div>
                  )}
                  {activity.price === 0 && (
                    <div className="text-sm font-semibold text-green-600">FREE</div>
                  )}
                </div>

                {/* Activity Options */}
                {activity.options && activity.options.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Available Options:</h4>
                    <div className="space-y-2">
                      {activity.options.map((option) => (
                        <div key={option.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{option.name}</p>
                            <p className="text-xs text-gray-600">{option.description}</p>
                          </div>
                          <div className="text-right">
                            {option.price > 0 && (
                              <p className="font-bold text-sm text-emerald-600">${option.price}</p>
                            )}
                            <span className={`text-xs ${option.available ? 'text-green-600' : 'text-red-600'}`}>
                              {option.available ? 'Available' : 'Full'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleBookActivity(activity.id)}
                  disabled={activity.current_participants >= activity.capacity}
                >
                  {activity.current_participants >= activity.capacity ? 'Fully Booked' : 'Book Activity'}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  )
}
