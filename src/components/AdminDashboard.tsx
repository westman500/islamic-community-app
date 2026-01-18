import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { MobileLayout } from './MobileLayout'
import {
  Users,
  UserPlus,
  Award,
  TrendingUp,
  Bell,
  Activity,
  Mail,
  Trash2,
  Edit,
  Send,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'lucide-react'

interface PlatformStats {
  total_users: number
  new_users_today: number
  new_users_this_week: number
  new_users_this_month: number
  total_scholars: number
  verified_scholars: number
  total_consultations: number
  active_consultations: number
  completed_consultations: number
  total_donations: number
  total_streams: number
  active_streams: number
}

interface OnboardingUser {
  id: string
  user_id: string
  full_name: string
  email: string
  registration_date: string
  onboarding_step: string
  onboarding_completed: boolean
  referral_source: string
  device_type: string
  last_active_date: string
}

interface Campaign {
  id: string
  name: string
  description: string
  campaign_type: string
  target_audience: string
  status: string
  scheduled_at: string | null
  total_recipients: number
  total_sent: number
  total_delivered: number
  total_opened: number
  message_title: string
  message_body: string
  action_url: string
  created_at: string
}

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'campaigns' | 'activities'>('overview')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [onboardingUsers, setOnboardingUsers] = useState<OnboardingUser[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Campaign form
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    target_audience: 'all',
    message_title: '',
    message_body: '',
    action_url: ''
  })

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDashboardData()

      // Setup realtime subscription for new users
      const profilesChannel = supabase
        .channel('admin-profiles-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {
          console.log('Profiles changed, refreshing admin data...')
          fetchDashboardData()
        })
        .subscribe((status) => {
          console.log('Admin realtime subscription:', status)
        })

      // Also subscribe to onboarding tracking changes
      const onboardingChannel = supabase
        .channel('admin-onboarding-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_onboarding_tracking'
        }, () => {
          console.log('Onboarding tracking changed, refreshing...')
          fetchDashboardData()
        })
        .subscribe()

      // Fallback: Auto-refresh every 30 seconds in case realtime fails
      const refreshInterval = setInterval(() => {
        console.log('Auto-refresh admin data...')
        fetchDashboardData()
      }, 30000)

      return () => {
        profilesChannel.unsubscribe()
        onboardingChannel.unsubscribe()
        clearInterval(refreshInterval)
      }
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch platform statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_platform_statistics')

      if (statsError) throw statsError

      if (statsData && statsData.length > 0) {
        setStats(statsData[0])
      }

      // Fetch recent onboarding users
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('user_onboarding_tracking')
        .select(`
          *,
          profiles!user_id(full_name, email)
        `)
        .order('registration_date', { ascending: false })
        .limit(50)

      if (onboardingError) throw onboardingError

      const formattedUsers = (onboardingData || []).map((item: any) => ({
        ...item,
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || 'N/A'
      }))

      setOnboardingUsers(formattedUsers)

      // Fetch marketing campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (campaignsError) throw campaignsError

      setCampaigns(campaignsData || [])

    } catch (err: any) {
      console.error('Error fetching admin data:', err)
      setError('Failed to load admin dashboard: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async () => {
    try {
      setError('')
      setSuccess('')

      if (!campaignForm.name || !campaignForm.message_title || !campaignForm.message_body) {
        setError('Please fill in all required fields')
        return
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([{
          name: campaignForm.name,
          description: campaignForm.description,
          target_audience: campaignForm.target_audience,
          message_title: campaignForm.message_title,
          message_body: campaignForm.message_body,
          action_url: campaignForm.action_url,
          created_by: profile?.id,
          status: 'draft'
        }])
        .select()

      if (error) throw error

      setSuccess('Campaign created successfully!')
      setCampaignForm({
        name: '',
        description: '',
        target_audience: 'all',
        message_title: '',
        message_body: '',
        action_url: ''
      })

      fetchDashboardData()

    } catch (err: any) {
      console.error('Error creating campaign:', err)
      setError('Failed to create campaign: ' + err.message)
    }
  }

  const sendCampaign = async (campaignId: string) => {
    try {
      setError('')
      setSuccess('')

      const campaign = campaigns.find(c => c.id === campaignId)
      if (!campaign) return

      const { data, error } = await supabase
        .rpc('send_marketing_push_notification', {
          p_campaign_id: campaignId,
          p_target_audience: campaign.target_audience
        })

      if (error) throw error

      const result = data[0]
      setSuccess(`Campaign sent! ${result.success_count} sent, ${result.failed_count} failed`)

      fetchDashboardData()

    } catch (err: any) {
      console.error('Error sending campaign:', err)
      setError('Failed to send campaign: ' + err.message)
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('Campaign deleted successfully')
      fetchDashboardData()

    } catch (err: any) {
      console.error('Error deleting campaign:', err)
      setError('Failed to delete campaign: ' + err.message)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setSuccess(`User role updated to ${newRole}`)
      fetchDashboardData()

    } catch (err: any) {
      console.error('Error updating user:', err)
      setError('Failed to update user: ' + err.message)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setSuccess('User deleted successfully')
      fetchDashboardData()

    } catch (err: any) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user: ' + err.message)
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <MobileLayout title="Access Denied">
        <div className="p-6 text-center">
          <p className="text-destructive">You do not have permission to access this page.</p>
        </div>
      </MobileLayout>
    )
  }

  if (loading) {
    return (
      <MobileLayout title="Admin Dashboard">
        <div className="p-6 text-center">
          <p>Loading admin dashboard...</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Admin Dashboard">
      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className="whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
            className="whitespace-nowrap"
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
          <Button
            variant={activeTab === 'campaigns' ? 'default' : 'outline'}
            onClick={() => setActiveTab('campaigns')}
            className="whitespace-nowrap"
          >
            <Bell className="w-4 h-4 mr-2" />
            Campaigns
          </Button>
          <Button
            variant={activeTab === 'activities' ? 'default' : 'outline'}
            onClick={() => setActiveTab('activities')}
            className="whitespace-nowrap"
          >
            <Activity className="w-4 h-4 mr-2" />
            Activities
          </Button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Platform Statistics</h2>

            {/* User Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-500" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_users.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <UserPlus className="w-4 h-4 mr-2 text-green-500" />
                    New Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.new_users_today}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.new_users_this_week}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.new_users_this_month}</p>
                </CardContent>
              </Card>
            </div>

            {/* Scholar Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Award className="w-4 h-4 mr-2 text-yellow-500" />
                    Total Scholars
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_scholars}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Verified
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.verified_scholars}</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Consultations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_consultations}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.active_consultations} active, {stats.completed_consultations} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₦{stats.total_donations.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total raised</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Streams</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_streams}</p>
                  <p className="text-xs text-muted-foreground">{stats.active_streams} active now</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">User Onboarding Tracking</h2>

            <div className="space-y-2">
              {onboardingUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserRole(user.user_id, 'scholar')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(user.user_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Registered</p>
                        <p>{new Date(user.registration_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="flex items-center">
                          {user.onboarding_completed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                          )}
                          {user.onboarding_step}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Source</p>
                        <p>{user.referral_source || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Device</p>
                        <p>{user.device_type || 'web'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {onboardingUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Marketing Campaigns</h2>

            {/* Create Campaign Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
                <CardDescription>Send push notifications to your users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Campaign Name</label>
                  <Input
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="Ramadan Reminder Campaign"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Target Audience</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={campaignForm.target_audience}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_audience: e.target.value })}
                  >
                    <option value="all">All Users</option>
                    <option value="new_users">New Users (Last 7 days)</option>
                    <option value="active_users">Active Users (Last 30 days)</option>
                    <option value="inactive_users">Inactive Users (30+ days)</option>
                    <option value="scholars">Scholars & Imams</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Notification Title</label>
                  <Input
                    value={campaignForm.message_title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, message_title: e.target.value })}
                    placeholder="Join us for Ramadan"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notification Message</label>
                  <Textarea
                    value={campaignForm.message_body}
                    onChange={(e) => setCampaignForm({ ...campaignForm, message_body: e.target.value })}
                    placeholder="Special events and programs during Ramadan..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Action URL (Optional)</label>
                  <Input
                    value={campaignForm.action_url}
                    onChange={(e) => setCampaignForm({ ...campaignForm, action_url: e.target.value })}
                    placeholder="/events or https://example.com"
                  />
                </div>

                <Button onClick={createCampaign} className="w-full">
                  <Target className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Existing Campaigns */}
            <div className="space-y-2">
              <h3 className="font-semibold">Existing Campaigns</h3>
              
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => sendCampaign(campaign.id)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCampaign(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <p>{campaign.target_audience}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="flex items-center">
                          {campaign.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          ) : campaign.status === 'draft' ? (
                            <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          {campaign.status}
                        </p>
                      </div>
                    </div>

                    {campaign.status === 'completed' && (
                      <div className="text-sm bg-muted p-2 rounded">
                        <p>📊 Recipients: {campaign.total_recipients} | Sent: {campaign.total_sent} | Delivered: {campaign.total_delivered}</p>
                      </div>
                    )}

                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="font-medium">{campaign.message_title}</p>
                      <p className="text-muted-foreground">{campaign.message_body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {campaigns.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No campaigns created yet</p>
              )}
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Platform Activities</h2>
            <p className="text-muted-foreground">Activity tracking coming soon...</p>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
