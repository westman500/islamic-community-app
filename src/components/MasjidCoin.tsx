import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Coins, DollarSign, TrendingUp, Zap, Heart, Video, Calendar } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'

interface Transaction {
  id: string
  amount: number
  coins: number
  type: 'deposit' | 'livestream' | 'consultation' | 'donation'
  description: string
  date: string
}

export const MasjidCoin: React.FC = () => {
  const { profile } = useAuth()
  const [coinBalance, setCoinBalance] = useState(0)
  const [depositAmount, setDepositAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Conversion rate: 100 Naira = 1 Masjid Coin
  const CONVERSION_RATE = 0.01 // 1 coin per 100 Naira

  useEffect(() => {
    if (!profile?.id) return
    
    fetchCoinBalance()

    // Subscribe to realtime balance updates
    const balanceChannel = supabase
      .channel('masjid-coin-balance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Balance updated:', payload)
          setCoinBalance(payload.new.masjid_coin_balance || 0)
        }
      )
      .subscribe()

    // Subscribe to realtime transaction updates
    const txChannel = supabase
      .channel('masjid-coin-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'masjid_coin_transactions',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('New transaction:', payload)
          fetchCoinBalance() // Refresh all data
        }
      )
      .subscribe()

    return () => {
      balanceChannel.unsubscribe()
      txChannel.unsubscribe()
    }
  }, [profile?.id])

  const fetchCoinBalance = async () => {
    try {
      // Fetch real balance from database
      if (!profile?.id) return
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', profile.id)
        .single()
      
      if (profileError) throw profileError
      
      setCoinBalance(profileData?.masjid_coin_balance || 0)
      
      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('masjid_coin_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (txError) throw txError
      
      const formattedTx = (txData || []).map(tx => ({
        id: tx.id,
        amount: Math.abs(tx.amount / 100), // Convert from coins to currency
        coins: Math.abs(tx.amount),
        type: tx.type,
        description: tx.description,
        date: new Date(tx.created_at).toLocaleDateString()
      }))
      
      setTransactions(formattedTx)
    } catch (err) {
      console.error('Error fetching coin balance:', err)
    }
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    
    if (!amount || amount < 100) {
      setError('Please enter a valid amount (minimum 100 Naira)')
      return
    }

    if (!profile?.id || !profile?.email) {
      setError('Profile not loaded. Please refresh the page.')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Generate unique payment reference
      const reference = `DEP_${profile.id}_${Date.now()}`
      
      // Create pending transaction record
      const { error: txError } = await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: profile.id,
          amount: Math.floor(amount * CONVERSION_RATE), // Convert to coins
          type: 'deposit',
          description: `Deposit ${amount} Naira`,
          payment_reference: reference,
          payment_status: 'pending'
        })
      
      if (txError) throw txError

      // Initialize Paystack payment
      const { initializePaystackPayment } = await import('../utils/paystack')
      
      await initializePaystackPayment({
        email: profile.email,
        amount: amount, // Amount in Naira
        reference: reference,
        metadata: {
          project: 'masjid-app', // Identifier for this project
          user_id: profile.id,
          transaction_type: 'deposit',
          coins: Math.floor(amount * CONVERSION_RATE)
        }
      })

      // Payment successful - webhook will handle the balance update
      setSuccess(`Payment initiated! Your coins will be credited shortly.`)
      setDepositAmount('')
      
      // Refresh balance after a short delay
      setTimeout(() => {
        fetchCoinBalance()
      }, 3000)
      
    } catch (err: any) {
      console.error('Deposit error:', err)
      setError(err.message || 'Failed to process deposit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const coinsToDisplay = coinBalance.toLocaleString()
  const nairaValue = (coinBalance / CONVERSION_RATE).toFixed(2)

  return (
    <MobileLayout title="Masjid Coin Wallet">
      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6" />
              <CardTitle className="text-white">Masjid Coin Balance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold">{coinsToDisplay}</span>
              <span className="text-xl">coins</span>
            </div>
            <p className="text-amber-100 text-sm">
              ≈ ₦{nairaValue}
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                <span className="font-semibold">Conversion Rate</span>
              </div>
              <span className="text-lg font-bold text-amber-600">
                ₦100 = 1 coin
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Deposit Funds
            </CardTitle>
            <CardDescription>
              Convert your money to Masjid Coins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Naira)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">₦</span>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10"
                  min="100"
                  step="100"
                />
              </div>
              {depositAmount && parseFloat(depositAmount) >= 100 && (
                <p className="text-xs text-gray-500">
                  You'll receive: <span className="font-bold text-amber-600">
                    {(parseFloat(depositAmount) * CONVERSION_RATE).toLocaleString()} coins
                  </span>
                </p>
              )}
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(value.toString())}
                  className="text-xs"
                >
                  ₦{value}
                </Button>
              ))}
            </div>

            <Button
              onClick={handleDeposit}
              disabled={loading || !depositAmount}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {loading ? 'Processing...' : 'Deposit & Convert to Coins'}
            </Button>
          </CardContent>
        </Card>

        {/* Usage Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to Use Masjid Coins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-50">
                  <Video className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Livestream Tips</p>
                  <p className="text-xs text-gray-600">
                    Send tips to scholars during live streams
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Book Consultations</p>
                  <p className="text-xs text-gray-600">
                    Pay for consultation sessions with scholars
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Heart className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Donations & Zakat</p>
                  <p className="text-xs text-gray-600">
                    Make charitable donations to scholars
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Recent coin deposits and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No transactions yet
                </p>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === 'deposit'
                            ? 'bg-green-100'
                            : transaction.type === 'livestream'
                            ? 'bg-red-100'
                            : transaction.type === 'consultation'
                            ? 'bg-blue-100'
                            : 'bg-amber-100'
                        }`}
                      >
                        {transaction.type === 'deposit' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : transaction.type === 'livestream' ? (
                          <Video className="h-4 w-4 text-red-600" />
                        ) : transaction.type === 'consultation' ? (
                          <Calendar className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Heart className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          transaction.type === 'deposit'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'deposit' ? '+' : '-'}
                        {transaction.coins.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500">
                        ${transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
