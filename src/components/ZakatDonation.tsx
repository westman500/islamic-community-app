import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Heart, Coins } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { notifyDonationReceived } from '../utils/pushNotifications'

interface Scholar {
  id: string
  name: string
  specialization: string
  avatar_url?: string
}

export const ZakatDonation: React.FC = () => {
  const { profile } = useAuth()
  const { showNotification } = useNotification()
  const [scholars, setScholars] = useState<Scholar[]>([])
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingScholars, setLoadingScholars] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentBalance, setCurrentBalance] = useState<number>(0)

  useEffect(() => {
    fetchScholars()
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        setCurrentBalance(userProfile.masjid_coin_balance || 0)
      }
    } catch (err) {
      console.error('Error fetching balance:', err)
    }
  }

  const fetchScholars = async () => {
    try {
      setLoadingScholars(true)
      console.log('Fetching scholars and imams...')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, specializations, role')
        .or('role.eq.scholar,role.eq.imam')
        .order('full_name')
      
      if (error) {
        console.error('Error fetching scholars:', error)
        throw error
      }
      
      console.log('Fetched scholars:', data?.length || 0, data)
      
      const formattedScholars = (data || []).map(s => ({
        id: s.id,
        name: s.full_name || 'Unknown',
        specialization: (s.specializations && s.specializations.length > 0) ? s.specializations[0] : 'Islamic Studies'
      }))
      
      setScholars(formattedScholars)
    } catch (err: any) {
      console.error('Error fetching scholars:', err)
      setError('Failed to load scholars: ' + err.message)
    } finally {
      setLoadingScholars(false)
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

      console.log(`💰 Processing zakat donation: ${coinsAmount} coins from ${userProfile.full_name} to ${selectedScholar.name}`)

      // Create two transaction records for proper accounting:
      // 1. Debit transaction for donor (negative amount)
      // 2. Credit transaction for scholar (positive amount)
      // Database trigger will automatically update both balances
      
      const { error: debitTxError } = await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: user.id,
          recipient_id: null,
          amount: -coinsAmount, // Negative for debit
          type: 'donation',
          description: `Zakat donation to ${selectedScholar.name}`,
          payment_reference: reference,
          payment_status: 'completed',
          status: 'completed'
        })

      if (debitTxError) {
        console.error('❌ Failed to create debit transaction:', debitTxError)
        throw new Error('Failed to process donation')
      }

      const { error: creditTxError } = await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: user.id,
          recipient_id: selectedScholar.id,
          amount: coinsAmount, // Positive for credit
          type: 'donation',
          description: `Zakat donation from ${userProfile.full_name}`,
          payment_reference: reference,
          payment_status: 'completed',
          status: 'completed'
        })

      if (creditTxError) {
        console.error('❌ Failed to create credit transaction:', creditTxError)
        throw new Error('Failed to credit scholar')
      }

      console.log(`✅ Zakat donation transactions created. Database trigger will update balances automatically.`)
      console.log(`   Donor: -${coinsAmount} coins | Scholar: +${coinsAmount} coins`)
      
      setSuccess(true)
      showNotification(`Zakat donation of ${coinsAmount} coins sent to ${selectedScholar.name}. May Allah accept your charity!`, 'success')
      
      // Notify scholar about received donation
      if (profile) {
        const nairaAmount = coinsAmount * 100 // Convert coins to Naira
        const { notifyScholarDonationReceived } = await import('../utils/pushNotifications')
        try {
          await notifyScholarDonationReceived(
            selectedScholar.id,
            profile.full_name || 'A donor',
            nairaAmount
          )
          await notifyDonationReceived(profile.full_name || 'A donor', nairaAmount)
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr)
        }
      }
      
      setAmount('')
      setSelectedScholar(null)
      
      // Refresh balance after successful donation
      await fetchBalance()
      
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
                      💰 {currentBalance.toLocaleString()} coins
                    </span>
                  </div>
                </div>
              )}

              {/* Scholar selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Scholar/Imam to Support
                </label>
                {loadingScholars ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading scholars...</p>
                  </div>
                ) : scholars.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-2">No scholars or imams registered yet</p>
                    <p className="text-xs text-muted-foreground">
                      Scholars and imams need to register with their roles to appear here
                    </p>
                  </div>
                ) : (
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
                )}
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
                    variant={amount === value.toString() ? "default" : "outline"}
                    onClick={() => setAmount(value.toString())}
                    className="min-h-[44px] active:scale-95 transition-transform"
                    size="lg"
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
