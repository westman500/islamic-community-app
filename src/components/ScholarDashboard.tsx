import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { MobileLayout } from './MobileLayout'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DollarSign, Users, Calendar, TrendingUp, Clock, MessageCircle } from 'lucide-react'

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
      totalConsultations: 0,
      totalEarnings: 0,
      totalStreams: 0,
      totalViewers: 0,
      upcomingBookings: 0,
      completedConsultations: 0
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
      <div className="h-full overflow-hidden flex flex-col p-4 space-y-3">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none shadow-lg text-white flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <img 
                src="/masjid-logo-dashboard.png" 
                alt="Masjid Logo" 
                className="h-10 w-auto"
                crossOrigin="anonymous"
              />
              <div>
                <h2 className="text-lg font-bold">Welcome, {profile?.full_name}</h2>
                <p className="text-emerald-100 text-[10px] mt-0.5">
                  Scholar Dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <Button 
            onClick={() => navigate('/scholar-consultations')}
            className="bg-emerald-600 hover:bg-emerald-700 h-auto py-2.5"
          >
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px] leading-tight">My Consultations</span>
            </div>
          </Button>
          <Button 
            onClick={() => navigate('/wallet')}
            variant="outline"
            className="h-auto py-2.5"
          >
            <div className="flex flex-col items-center gap-0.5">
              <DollarSign className="w-4 h-4" />
              <span className="text-[10px] leading-tight">Wallet</span>
            </div>
          </Button>
        </div>

        {/* Stats Grid - No Scroll, Compact */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className={`${stat.color} border-none shadow-sm`}>
                  <CardContent className="p-2">
                    <div className="flex flex-col items-center">
                      <div className={`p-1 rounded-lg bg-white mb-1`}>
                        <Icon className={`h-3 w-3 ${stat.iconColor}`} />
                      </div>
                      <p className="text-base font-bold text-gray-900">{stat.value}</p>
                      <p className="text-[9px] font-semibold text-gray-700 text-center leading-tight">{stat.title}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-1 pt-2">
              <CardTitle className="text-xs">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-green-100 rounded-full">
                      <DollarSign className="h-2.5 w-2.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold">Consultation Payment</p>
                      <p className="text-[8px] text-gray-600">2 hours ago</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-green-600">+$50</span>
                </div>

                <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-violet-100 rounded-full">
                      <Calendar className="h-2.5 w-2.5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold">New Booking</p>
                      <p className="text-[8px] text-gray-600">5 hours ago</p>
                    </div>
                  </div>
                  <span className="text-[8px] text-gray-600">Tomorrow 2PM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  )
}
