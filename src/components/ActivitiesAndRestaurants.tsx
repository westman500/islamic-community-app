import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { Calendar, MapPin, Users, Clock, Star, Phone, Utensils, BookOpen, Heart, Building } from 'lucide-react'

interface Activity {
  id: string
  title: string
  description: string
  category: string
  location: string
  start_time: string
  end_time: string | null
  image_url: string | null
  max_participants: number | null
  current_participants: number
}

interface Restaurant {
  id: string
  name: string
  description: string
  cuisine_type: string
  address: string
  phone: string
  halal_certified: boolean
  rating: number
  price_range: string
  image_url: string | null
  delivery_available: boolean
}

export const ActivitiesAndRestaurants: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [activeTab, setActiveTab] = useState<'activities' | 'restaurants'>('activities')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (activitiesError) throw activitiesError
      setActivities(activitiesData || [])

      // Fetch restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })

      if (restaurantsError) throw restaurantsError
      setRestaurants(restaurantsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'education': return <BookOpen className="h-4 w-4" />
      case 'charity': return <Heart className="h-4 w-4" />
      case 'social': return <Users className="h-4 w-4" />
      case 'prayers': return <Building className="h-4 w-4" />
      case 'family': return <Users className="h-4 w-4" />
      case 'sports': return <Calendar className="h-4 w-4" />
      case 'business': return <Building className="h-4 w-4" />
      case 'arts': return <BookOpen className="h-4 w-4" />
      case 'library': return <BookOpen className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const filteredActivities = selectedCategory === 'all' 
    ? activities 
    : activities.filter(a => a.category === selectedCategory)

  const categories = ['all', 'education', 'prayers', 'sports', 'social', 'charity', 'business', 'family', 'arts', 'library']

  return (
    <MobileLayout title="Community">
      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activities...</p>
        </div>
      ) : (
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('activities')}
            variant={activeTab === 'activities' ? 'default' : 'outline'}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Activities ({activities.length})
          </Button>
          <Button
            onClick={() => setActiveTab('restaurants')}
            variant={activeTab === 'restaurants' ? 'default' : 'outline'}
            className="flex-1"
          >
            <Utensils className="h-4 w-4 mr-2" />
            Restaurants ({restaurants.length})
          </Button>
        </div>

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <>
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <Card key={activity.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {activity.image_url && (
                    <img
                      src={activity.image_url}
                      alt={activity.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1 capitalize">
                            {getCategoryIcon(activity.category)}
                            {activity.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{activity.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{formatDate(activity.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{activity.location}</span>
                      </div>
                      {activity.max_participants && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>
                            {activity.current_participants} / {activity.max_participants} registered
                          </span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // TODO: Implement registration
                        alert('Registration coming soon!')
                      }}
                    >
                      Register Now
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {filteredActivities.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="font-bold text-lg mb-2">No Activities Found</h3>
                    <p className="text-gray-600">Check back soon for upcoming events!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {restaurant.image_url && (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{restaurant.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{restaurant.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                          {restaurant.cuisine_type}
                        </span>
                        {restaurant.halal_certified && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            ✓ Halal Certified
                          </span>
                        )}
                        {restaurant.delivery_available && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            🚚 Delivery
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{restaurant.rating}</span>
                      <span className="text-gray-400">•</span>
                      <span>{restaurant.price_range}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{restaurant.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <a href={`tel:${restaurant.phone}`} className="text-primary hover:underline">
                        {restaurant.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      variant="outline"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        alert('Menu coming soon!')
                      }}
                    >
                      View Menu
                    </Button>
                    <Button 
                      className="flex-1"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        alert('Ordering coming soon!')
                      }}
                    >
                      Order Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {restaurants.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Utensils className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-bold text-lg mb-2">No Restaurants Found</h3>
                  <p className="text-gray-600">Check back soon for halal dining options!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      )}
    </MobileLayout>
  )
}
