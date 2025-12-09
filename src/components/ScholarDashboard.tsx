import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { MobileLayout } from './MobileLayout'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DollarSign, Users, Calendar, TrendingUp, Clock, MessageCircle, Settings } from 'lucide-react'

export const ScholarDashboard: React.FC = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalConsultations: 0,
    totalEarnings: 0,
    totalStreams: 0,
    totalViewers: 0,
    upcomingBookings: 0,
    completedConsultations: 0
  })

  useEffect(() => {
    // TODO: Fetch actual stats from database
    setStats({
      totalConsultations: 24,
      totalEarnings: 1250,
      totalStreams: 15,
      totalViewers: 340,
      upcomingBookings: 3,
      completedConsultations: 21
    })
  }, [])

  const statCards = [
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings}`,
      icon: DollarSign,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
      description: 'From consultations'
    },
    {
      title: 'Consultations',
      value: stats.totalConsultations,
      icon: Calendar,
      color: 'bg-violet-50',
      iconColor: 'text-violet-600',
      description: 'Total bookings'
    },
    {
      title: 'Live Streams',
      value: stats.totalStreams,
      icon: BarChart3,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
      description: 'Total broadcasts'
    },
    {
      title: 'Total Viewers',
      value: stats.totalViewers,
      icon: Users,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Across all streams'
    },
    {
      title: 'Upcoming',
      value: stats.upcomingBookings,
      icon: Clock,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
      description: 'Scheduled bookings'
    },
    {
      title: 'Completed',
      value: stats.completedConsultations,
      icon: TrendingUp,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      description: 'Finished sessions'
    }
  ]

  return (
    <MobileLayout title="Scholar Analytics">
      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none shadow-lg text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-300/30 rounded-full blur-lg animate-pulse"></div>
                <img 
                  src="/crescent-logo.svg" 
                  alt="Islamic Crescent" 
                  className="relative h-16 w-16 drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(253, 224, 71, 0.5))' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome, {profile?.full_name}</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Scholar Dashboard
                </p>
              </div>
            </div>
            <p className="text-emerald-100">
              Here's an overview of your performance and activities
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => navigate('/scholar-consultations')}
            className="bg-emerald-600 hover:bg-emerald-700 h-auto py-4"
          >
            <div className="flex flex-col items-center gap-1">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">My Consultations</span>
            </div>
          </Button>
          <Button 
            onClick={() => navigate('/wallet')}
            variant="outline"
            className="h-auto py-4"
          >
            <div className="flex flex-col items-center gap-1">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">Wallet</span>
            </div>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className={`${stat.color} border-none shadow-md`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-white`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-sm font-semibold text-gray-700">{stat.title}</p>
                    <p className="text-xs text-gray-600">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Consultation Payment</p>
                    <p className="text-xs text-gray-600">2 hours ago</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">+$50</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-full">
                    <Calendar className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">New Booking</p>
                    <p className="text-xs text-gray-600">5 hours ago</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600">Tomorrow 2PM</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Users className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Live Stream Ended</p>
                    <p className="text-xs text-gray-600">Yesterday</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600">45 viewers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Consultation Success Rate</span>
                  <span className="font-bold text-emerald-600">87%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Average Stream Viewers</span>
                  <span className="font-bold text-blue-600">23 per stream</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Member Satisfaction</span>
                  <span className="font-bold text-amber-600">4.8/5.0</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
