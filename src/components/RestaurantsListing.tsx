import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, MapPin, Phone, Clock, Star, Utensils, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from './ui/input'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  address: string
  phone: string
  hours: string
  rating: number
  reviews: number
  image: string
  halal: boolean
  delivery: boolean
  priceRange: string
  description: string
}

export const RestaurantsListing: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all')

  const cuisineTypes = ['all', 'Mediterranean', 'Turkish', 'Arabic', 'Pakistani', 'Egyptian', 'Moroccan']
  const restaurants: Restaurant[] = []

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCuisine = selectedCuisine === 'all' || 
                          restaurant.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase())
    return matchesSearch && matchesCuisine
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-emerald-500 mr-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Halal Restaurants</h1>
            <p className="text-sm text-emerald-100">Discover local dining options</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-gray-900"
          />
        </div>
      </div>

      {/* Cuisine Filter */}
      <div className="px-4 py-3 bg-white shadow-sm overflow-x-auto">
        <div className="flex gap-2">
          {cuisineTypes.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCuisine === cuisine
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 text-sm text-gray-600">
        {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} found
      </div>

      {/* Restaurant Cards */}
      <div className="px-4 space-y-4">
        {filteredRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex">
              {/* Image */}
              <div className="w-32 h-32 flex-shrink-0">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <CardContent className="flex-1 p-3">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">
                    {restaurant.name}
                  </h3>
                  {restaurant.halal && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                      Halal ✓
                    </span>
                  )}
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Utensils className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">{restaurant.cuisine}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-xs font-medium text-gray-700">{restaurant.priceRange}</span>
                </div>

                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-semibold text-sm">{restaurant.rating}</span>
                    <span className="text-gray-500 text-xs ml-1">({restaurant.reviews})</span>
                  </div>
                  {restaurant.delivery && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                      🚚 Delivery
                    </span>
                  )}
                </div>

                <div className="flex items-start text-xs text-gray-600 mb-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{restaurant.address}</span>
                </div>

                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">{restaurant.hours}</span>
                </div>
              </CardContent>
            </div>

            {/* Call Button */}
            <div className="px-3 pb-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`tel:${restaurant.phone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </div>
          </Card>
        ))}

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No restaurants found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
