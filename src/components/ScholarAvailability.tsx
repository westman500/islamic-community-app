import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { supabase } from '../utils/supabase/client'
import { MobileLayout } from './MobileLayout'
import { useAuth } from '../contexts/AuthContext'

export const ScholarAvailability: React.FC = () => {
  const { profile } = useAuth()
  const [isOnline, setIsOnline] = useState<boolean>(false)
  const [busy, setBusy] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return
      const { data: p } = await supabase
        .from('profiles')
        .select('is_online')
        .eq('id', profile.id)
        .single()
      setIsOnline(!!p?.is_online)

      const { data: active } = await supabase
        .from('consultations')
        .select('id, started_at, actual_ended_at, status')
        .eq('scholar_id', profile.id)
        .is('actual_ended_at', null)
        .limit(1)
      setBusy(!!active && active.length > 0 && !!active[0].started_at && active[0].status !== 'completed')
    }
    load()

    const sub = supabase
      .channel('availability-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `scholar_id=eq.${profile?.id}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile?.id}` }, () => load())
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [profile?.id])

  const toggleOnline = async (value: boolean) => {
    try {
      setLoading(true)
      setError('')
      if (!profile?.id) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: value })
        .eq('id', profile.id)
      if (error) throw error
      setIsOnline(value)
    } catch (e: any) {
      setError(e.message || 'Failed to update availability')
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = busy ? 'Busy (in consultation)' : (isOnline ? 'Available' : 'Offline')

  return (
    <MobileLayout title="Availability" showBack>
      <Card>
        <CardHeader>
          <CardTitle>Consultation Availability</CardTitle>
          <CardDescription>
            Toggle whether members can see and book you for consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded bg-gray-50">
            <p className="text-sm">Current Status: <span className="font-semibold">{statusLabel}</span></p>
          </div>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || busy || isOnline}
              onClick={() => toggleOnline(true)}
            >
              Set Available
            </Button>
            <Button
              variant="outline"
              disabled={loading || !isOnline}
              onClick={() => toggleOnline(false)}
            >
              Go Offline
            </Button>
          </div>
          {busy && (
            <p className="text-xs text-muted-foreground">You are in an active consultation; availability changes are disabled.</p>
          )}
        </CardContent>
      </Card>
    </MobileLayout>
  )
}
