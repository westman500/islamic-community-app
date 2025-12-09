import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Heart, DollarSign, Coins } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'

interface Scholar {
  id: string
  name: string
  specialization: string
  avatar_url?: string
}

export const ZakatDonation: React.FC = () => {
  const { profile } = useAuth()
  const [scholars, setScholars] = useState<Scholar[]>([])
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchScholars()
  }, [])

  const fetchScholars = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, specialization')
        .in('role', ['scholar', 'imam'])
        .order('full_name')
      
      if (error) throw error
      
      const formattedScholars = (data || []).map(s => ({
        id: s.id,
        name: s.full_name,
        specialization: s.specialization || 'Islamic Studies'
      }))
      
      setScholars(formattedScholars)
    } catch (err) {
      console.error('Error fetching scholars:', err)
    }
  }

  const handleDonate = async () => {
    if (!selectedScholar) {
      setError('Please select a scholar/imam to support')
      return
    }

    const coinsAmount = parseFloat(amount)
    if (!coinsAmount || coinsAmount < 1) {
      setError('Please enter a valid amount (minimum 1 coin)')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to donate')
        setLoading(false)
        return
      }

      // Check user's Masjid Coin balance
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance, full_name')
        .eq('id', user.id)
        .single()

      if (profileError) throw new Error('Failed to fetch your balance')

      const currentBalance = userProfile?.masjid_coin_balance || 0

      if (currentBalance < coinsAmount) {
        throw new Error(`Insufficient balance. You need ${coinsAmount} coins but have ${currentBalance} coins. Please deposit more coins.`)
      }

      const reference = `DON_${user.id}_${Date.now()}`

      // Deduct coins from user's balance
      const newUserBalance = currentBalance - coinsAmount
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newUserBalance })
        .eq('id', user.id)

      if (deductError) throw new Error('Failed to deduct coins from your balance')

      // Add coins to scholar's balance
      const { data: scholarProfile, error: scholarProfileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', selectedScholar.id)
        .single()

      if (scholarProfileError) throw new Error('Failed to fetch scholar balance')

      const scholarBalance = scholarProfile?.masjid_coin_balance || 0
      const newScholarBalance = scholarBalance + coinsAmount

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', selectedScholar.id)

      if (creditError) throw new Error('Failed to credit scholar')

      // Create transaction record for user (debit)
      await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: user.id,
          recipient_id: selectedScholar.id,
          amount: -coinsAmount,
          type: 'donation',
          description: `Zakat donation to ${selectedScholar.name}`,
          payment_reference: reference,
          payment_status: 'success',
          status: 'completed'
        })

      // Create transaction record for scholar (credit)
      await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: selectedScholar.id,
          recipient_id: user.id,
          amount: coinsAmount,
          type: 'donation',
          description: `Zakat received from ${userProfile.full_name}`,
          payment_reference: reference,
          payment_status: 'success',
          status: 'completed'
        })
      
      setSuccess(true)
      setAmount('')
      setSelectedScholar(null)
      
      setTimeout(() => setSuccess(false), 5000)

      // Example API call structure:
      // const response = await apiCall('donate', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     scholarId: selectedScholar.id,
      //     amount: donationAmount,
      //     userId: profile?.id,
      //   })
      // })

    } catch (err: any) {
      setError(err.message || 'Failed to process donation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileLayout title="Zakat & Donations">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Zakat & Donations
          </CardTitle>
          <CardDescription>
            Support scholars with zakat from all sources (livestreams, non-livestreams) and charitable donations - separate from consultation booking fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="p-6 bg-primary/10 border border-primary rounded-lg text-center">
              <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
              <p className="text-muted-foreground">
                Your donation has been processed successfully. May Allah accept your charity.
              </p>
            </div>
          ) : (
            <>
              {/* Show user balance */}
              {profile && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Your Masjid Coin Balance:</span>
                    <span className="text-lg font-bold text-emerald-600">
                      💰 {(profile.masjid_coin_balance || 0).toLocaleString()} coins
                    </span>
                  </div>
                </div>
              )}

              {/* Scholar selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Scholar/Imam to Support
                </label>
                <div className="space-y-2">
                  {scholars.map((scholar) => (
                    <div
                      key={scholar.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedScholar?.id === scholar.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedScholar(scholar)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{scholar.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {scholar.specialization}
                          </p>
                        </div>
                        {selectedScholar?.id === scholar.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Donation Amount (Masjid Coins)
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    step="1"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum donation: 1 coin
                </p>
              </div>

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    onClick={() => setAmount(value.toString())}
                  >
                    💰 {value}
                  </Button>
                ))}
              </div>

              {/* Information */}
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">About Zakat & Donations</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 100% goes directly to the scholar/imam</li>
                  <li>• Includes: livestream tips, non-livestream zakat, and charitable donations</li>
                  <li>• Does NOT include consultation booking fees (handled separately)</li>
                  <li>• Paid instantly using your Masjid Coin balance</li>
                  <li>• Deposit more coins in MASJID COIN section if needed</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                onClick={handleDonate}
                disabled={loading || !selectedScholar || !amount}
                className="w-full"
                size="lg"
              >
                {loading ? 'Processing...' : 'Donate Now'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </MobileLayout>
  )
}
