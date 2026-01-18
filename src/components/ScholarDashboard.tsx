import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { MobileLayout } from './MobileLayout'
import { useNavigate } from 'react-router-dom'
import { BarChart3, DollarSign, Users, Calendar, TrendingUp, Clock, MessageCircle } from 'lucide-react'
import { CompactPrayerTimes } from './CompactPrayerTimes'

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
      <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden" style={{ top: 'calc(3.5rem + env(safe-area-inset-top))', bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
        {/* Fixed Header - Welcome + Prayer Times + Quick Actions */}
        <div className="flex-shrink-0 bg-gray-50 px-3 pb-1">
          {/* Compact Welcome Section */}
          <div className="flex items-center gap-2">
            <img 
              src="/masjid-logo-dashboard.png" 
              alt="Masjid Logo" 
              className="h-6 w-auto"
              crossOrigin="anonymous"
            />
            <div>
              <h2 className="text-xs font-bold text-gray-900">Welcome, {profile?.full_name}</h2>
              <p className="text-[9px] text-gray-600">Scholar Dashboard</p>
            </div>
          </div>

          {/* Fixed Prayer Times */}
          <div className="mt-0.5 mb-0.5">
            <CompactPrayerTimes />
          </div>

          {/* Fixed Quick Actions - 4 columns */}
          <div className="grid grid-cols-4 gap-1.5">
            <Button 
              onClick={() => navigate('/scholar-consultations')}
              className="bg-emerald-600 hover:bg-emerald-700 h-8 text-[10px] font-semibold px-2"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Consult
            </Button>
            <Button 
              onClick={() => navigate('/wallet')}
              variant="outline"
              className="h-8 text-[10px] font-semibold border px-2"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Wallet
            </Button>
            <Button 
              onClick={() => navigate('/start-stream')}
              className="bg-red-500 hover:bg-red-600 h-8 text-[10px] font-semibold px-2"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Live
            </Button>
            <Button 
              onClick={() => navigate('/manage-consultations')}
              variant="outline"
              className="h-8 text-[10px] font-semibold border px-2"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Manage
            </Button>
          </div>
        </div>

        {/* Stats Grid - Fixed below, no scroll */}
        <div className="flex-1 px-3 pt-2 overflow-hidden">
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className={`${stat.color} border-none shadow-sm`}>
                  <CardContent className="p-1.5">
                    <div className="flex flex-col items-center">
                      <div className={`p-0.5 rounded bg-white mb-0.5`}>
                        <Icon className={`h-3 w-3 ${stat.iconColor}`} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                      <p className="text-[8px] font-semibold text-gray-700 text-center leading-tight">{stat.title}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity - Compact */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0.5 pt-1.5 px-2">
              <CardTitle className="text-[10px]">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pb-1.5 px-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between p-1 bg-gray-50 rounded">
                  <div className="flex items-center gap-1">
                    <div className="p-0.5 bg-green-100 rounded-full">
                      <DollarSign className="h-2 w-2 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold">Consultation Payment</p>
                      <p className="text-[7px] text-gray-600">2 hours ago</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-green-600">+$50</span>
                </div>

                <div className="flex items-center justify-between p-1 bg-gray-50 rounded">
                  <div className="flex items-center gap-1">
                    <div className="p-0.5 bg-violet-100 rounded-full">
                      <Calendar className="h-2 w-2 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold">New Booking</p>
                      <p className="text-[7px] text-gray-600">5 hours ago</p>
                    </div>
                  </div>
                  <span className="text-[7px] text-gray-600">Tomorrow 2PM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  )
}
