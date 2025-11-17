import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  GraduationCap, 
  Dumbbell, 
  Users, 
  Building2, 
  UtensilsCrossed,
  Heart,
  Briefcase,
  Baby,
  Music,
  Book
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

interface Category {
  id: string
  name: string
  icon: any
  description: string
  color: string
  iconColor: string
  count: number
}

export const ActivityCategories: React.FC = () => {
  const navigate = useNavigate()

  const categories: Category[] = [
    {
      id: 'education',
      name: 'Islamic Education',
      icon: GraduationCap,
      description: 'Quran classes, Arabic lessons, Islamic studies',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      count: 12
    },
    {
      id: 'prayers',
      name: 'Prayer Services',
      icon: Building2,
      description: 'Jummah prayers, Taraweeh, Eid prayers',
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      count: 8
    },
    {
      id: 'sports',
      name: 'Sports & Fitness',
      icon: Dumbbell,
      description: 'Football, basketball, swimming, gym sessions',
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
      count: 15
    },
    {
      id: 'social',
      name: 'Social Events',
      icon: Users,
      description: 'Community gatherings, meetups, networking',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      count: 10
    },
    {
      id: 'restaurant',
      name: 'Halal Restaurants',
      icon: UtensilsCrossed,
      description: 'Discover halal dining options and food events',
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      count: 18
    },
    {
      id: 'charity',
      name: 'Charity & Volunteering',
      icon: Heart,
      description: 'Community service, fundraising, volunteer work',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
      count: 7
    },
    {
      id: 'business',
      name: 'Business & Career',
      icon: Briefcase,
      description: 'Workshops, networking, career development',
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      count: 9
    },
    {
      id: 'family',
      name: 'Family & Youth',
      icon: Baby,
      description: 'Family activities, youth programs, kids events',
      color: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      count: 14
    },
    {
      id: 'arts',
      name: 'Arts & Culture',
      icon: Music,
      description: 'Islamic art, nasheeds, cultural exhibitions',
      color: 'bg-teal-50',
      iconColor: 'text-teal-600',
      count: 6
    },
    {
      id: 'library',
      name: 'Library & Books',
      icon: Book,
      description: 'Book clubs, reading circles, library services',
      color: 'bg-gray-50',
      iconColor: 'text-gray-600',
      count: 5
    }
  ]

  return (
    <MobileLayout title="Activity Categories">
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Explore Community Activities
          </h2>
          <p className="text-gray-600">
            Browse activities by category and join your community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Card
                key={category.id}
                className={`${category.color} border-none shadow-md hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => navigate(`/activities/${category.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl shadow-md ${category.color}`}>
                      <Icon className={`h-8 w-8 ${category.iconColor} drop-shadow-md`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <p className="text-xs text-gray-600 mt-1">{category.count} activities</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{category.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-none shadow-md">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-lg mb-2">Looking for something specific?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Can't find what you're looking for? Contact us to suggest new activities!
            </p>
            <button
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md"
              onClick={() => navigate('/contact')}
            >
              Contact Us
            </button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
