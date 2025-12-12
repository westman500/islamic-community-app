import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Heart, DollarSign, TrendingUp, ArrowDownToLine, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'

interface ZakatTransaction {
  id: string
  amount: number
  donorName: string
  date: string
  type: 'zakat' | 'consultation' | 'withdrawal'
}

export const ScholarWallet: React.FC = () => {
  const { profile } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<ZakatTransaction[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBalance, setShowBalance] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    
    fetchWalletData()

    // Realtime: balance and transactions updates
    const channel = supabase
      .channel('wallet-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`
      }, () => {
        fetchWalletData()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'masjid_coin_transactions',
        filter: `recipient_id=eq.${profile.id}`
      }, () => {
        fetchWalletData()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'masjid_coin_transactions',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        fetchWalletData()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [profile?.id])

  const refetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (freshProfile) {
          console.log('✅ Profile refreshed, bank details:', {
            has_account: !!freshProfile.bank_account_number,
            has_code: !!freshProfile.bank_code,
            bank_name: freshProfile.bank_name
          })
        }
      }
    } catch (err) {
      console.error('Error refreshing profile:', err)
    }
  }

  const fetchWalletData = async () => {
    try {
      if (!profile?.id) {
        console.log('⚠️ No profile ID, skipping wallet fetch')
        return
      }
      
      console.log('📊 Fetching wallet data for scholar:', profile.id)
      
      // Fetch real wallet balance from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', profile.id)
        .single()
      
      if (profileError) throw profileError
      
      // Convert coins to Naira (1 coin = 100 Naira, so 5 coins = 500 Naira)
      const coinBalance = profileData?.masjid_coin_balance || 0
      const nairaBalance = coinBalance * 100
      console.log(`💰 Scholar balance: ${coinBalance} coins = ₦${nairaBalance}`)
      setBalance(nairaBalance)
      
      // Fetch transactions (donations received and withdrawals)
      // Only fetch COMPLETED transactions to exclude failed/pending withdrawals
      // IMPORTANT: Only show transactions where scholar is directly involved
      console.log('🔍 Fetching transactions for scholar ID:', profile.id)
      
      // Try primary transaction query with donor join
      let { data: txData, error: txError } = await supabase
        .from('masjid_coin_transactions')
        .select('id, amount, type, created_at, user_id, recipient_id, payment_status, donor:profiles!user_id(full_name)')
        .or(`recipient_id.eq.${profile.id},user_id.eq.${profile.id}`)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)

      if (txError) {
        console.warn('⚠️ Transaction query with join failed, using fallback:', txError)
        // Fallback: fetch without join, resolve donor names separately
        const alt = await supabase
          .from('masjid_coin_transactions')
          .select('id, amount, type, created_at, user_id, recipient_id, payment_status')
          .or(`recipient_id.eq.${profile.id},user_id.eq.${profile.id}`)
          .eq('payment_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20)
        txData = alt.data || []
      }
      
      console.log(`📋 Found ${txData?.length || 0} transactions`)
      
      // Debug: Log transaction types
      if (txData && txData.length > 0) {
        console.log('Transaction details:', txData.map((tx: any) => ({
          type: tx.type,
          amount: tx.amount,
          payment_status: tx.payment_status,
          recipient_id: tx.recipient_id,
          user_id: tx.user_id,
          is_for_scholar: tx.recipient_id === profile.id || tx.user_id === profile.id
        })))
      }

      // Map donor names; if missing, look up profile names for user_id
      const userIds = Array.from(new Set((txData || []).map((tx: any) => tx.user_id).filter(Boolean)))
      let donorMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: donors } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        donors?.forEach((d: any) => { donorMap[d.id] = d.full_name })
      }

      const formattedTx = (txData || []).map((tx: any) => {
        const isIncoming = tx.recipient_id === profile.id
        const isOutgoing = tx.user_id === profile.id
        
        // Security check: Ensure this transaction actually belongs to this scholar
        if (!isIncoming && !isOutgoing) {
          console.error('⚠️ Security violation: Transaction does not belong to scholar!', {
            tx_id: tx.id,
            scholar_id: profile.id,
            tx_recipient: tx.recipient_id,
            tx_user: tx.user_id
          })
          return null
        }
        
        let transactionType: 'zakat' | 'consultation' | 'withdrawal' = 'withdrawal'
        
        // Determine transaction type based on direction and type
        if (isIncoming) {
          // Money coming IN to scholar
          if (tx.type === 'donation' || tx.type === 'donation_received') {
            transactionType = 'zakat'
          } else if (tx.type === 'consultation') {
            transactionType = 'consultation'
          }
        } else if (isOutgoing && tx.type === 'withdrawal') {
          // Money going OUT from scholar
          transactionType = 'withdrawal'
        }
        
        // Convert coins to Naira (1 coin = 100 Naira)
        const amountInCoins = Math.abs(Number(tx.amount || 0))
        const amountInNaira = amountInCoins * 100
        
        return {
          id: tx.id,
          amount: amountInNaira,
          donorName: tx.donor?.full_name || donorMap[tx.user_id] || 'Anonymous',
          date: new Date(tx.created_at).toISOString(),
          type: transactionType
        }
      }).filter((tx): tx is ZakatTransaction => tx !== null) // Remove any null entries from security check
      
      setTransactions(formattedTx)
    } catch (err) {
      console.error('Error fetching wallet data:', err)
      setError('Failed to load wallet data')
    }
  }

  const handleWithdraw = async () => {
    const amountInNaira = parseFloat(withdrawAmount)
    
    if (!amountInNaira || amountInNaira < 100) {
      setError('Please enter a valid amount (minimum ₦100)')
      return
    }

    // Balance is in Naira, compare directly using absolute value
    const availableBalance = Math.abs(balance)
    if (amountInNaira > availableBalance) {
      setError(`Insufficient balance. You have ₦${availableBalance.toFixed(2)} available.`)
      return
    }

    // Check if scholar has bank account details configured
    if (!profile?.bank_account_number || !profile?.bank_code) {
      setError('Please add your bank account details in Profile Settings before withdrawing.')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Convert Naira to coins for database storage (1 coin = 100 Naira)
      const amountInCoins = amountInNaira / 100
      const paymentReference = `WTH_${Date.now()}_${Math.floor(Math.random() * 1000000)}`

      // Call Supabase Edge Function to process Paystack transfer FIRST
      // Don't deduct balance or create transaction until we confirm Paystack success
      console.log('💳 Calling withdrawal API with:', {
        amount: amountInNaira,
        reference: paymentReference,
        account_number: profile.bank_account_number,
        bank_code: profile.bank_code,
        account_name: profile.bank_account_name || profile.full_name
      })

      const { data: transferResult, error: transferError } = await supabase.functions.invoke(
        'process-withdrawal',
        {
          body: {
            amount: amountInNaira,
            reference: paymentReference,
            scholar_id: profile.id,
            account_number: profile.bank_account_number,
            bank_code: profile.bank_code,
            account_name: profile.bank_account_name || profile.full_name
          }
        }
      )

      console.log('📥 Withdrawal API response:', { transferResult, transferError })
      
      // Log the full error context for debugging
      if (transferError) {
        console.error('🔍 Full error details:', {
          name: transferError.name,
          message: transferError.message,
          context: transferError.context,
          details: transferError.details
        })
        
        // Try to get the response body
        if (transferError.context) {
          try {
            const errorBody = await transferError.context.json()
            console.error('🔍 Error response body:', errorBody)
          } catch (e) {
            console.error('Could not parse error response')
          }
        }
      }

      // Check if transfer was successful BEFORE touching the database
      if (transferError || !transferResult?.success) {
        // Check if it's a deployment/CORS error
        const errorMsg = transferError?.message || ''
        if (errorMsg.includes('Failed to send a request') || errorMsg.includes('CORS') || errorMsg.includes('ERR_FAILED')) {
          throw new Error('⚠️ Withdrawal system is being deployed. Please try again in a few minutes or contact support.')
        }
        
        // Show the actual error message from Paystack/Edge Function
        const detailedError = transferResult?.message || transferError?.message || 'Transfer failed'
        console.error('❌ Withdrawal failed:', detailedError)
        throw new Error(detailedError)
      }

      // Transfer successful! Now deduct balance and record transaction
      console.log('✅ Paystack transfer successful, updating database...')
      
      // Get current balance
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', profile.id)
        .single()
      
      if (profileError) throw profileError
      
      const currentCoins = Math.abs(profileData?.masjid_coin_balance || 0)
      const newBalance = currentCoins - amountInCoins
      
      // Deduct balance
      await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newBalance })
        .eq('id', profile.id)

      // Record completed transaction
      await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: profile?.id,
          recipient_id: profile?.id,
          amount: -amountInCoins,
          type: 'withdrawal',
          description: `Withdrawal to ${profile.bank_name || 'bank'} ${profile.bank_account_number?.slice(-4)}`,
          payment_reference: paymentReference,
          status: 'completed',
          payment_status: 'completed'
        })
      
      setSuccess(`Withdrawal of ₦${amountInNaira.toFixed(2)} initiated! Funds will arrive in your bank account within 24 hours.`)
      setWithdrawAmount('')
      
      // Refresh wallet data
      await fetchWalletData()
    } catch (err: any) {
      console.error('Withdrawal error:', err)
      setError(err.message || 'Failed to process withdrawal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalZakat = transactions
    .filter(t => t.type === 'zakat')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <MobileLayout title="Manage Wallet">
      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6" />
                <CardTitle className="text-white">Zakat & Consultation Balance</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-emerald-600"
                  onClick={async () => {
                    await fetchWalletData()
                    toast.success('Balance refreshed!')
                  }}
                  title="Refresh Balance"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-emerald-600"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {showBalance ? `₦${Math.abs(balance).toFixed(2)}` : '****'}
            </div>
            <p className="text-emerald-100 text-sm">
              From zakat contributions and consultation earnings
            </p>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Zakat Received</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  ₦{totalZakat.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Withdrawn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">
                  ₦{totalWithdrawals.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Withdraw Funds
            </CardTitle>
            <CardDescription>
              Transfer funds to your bank account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile?.bank_account_number && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                <strong>⚠️ Bank Account Required:</strong> Please add your bank account details in{' '}
                <button 
                  onClick={() => window.location.href = '/profile-settings'}
                  className="underline font-semibold hover:text-blue-900"
                >
                  Profile Settings
                </button> before withdrawing funds.
              </div>
            )}
            
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
              <label className="text-sm font-medium">Amount (₦)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10"
                  min="1"
                  max={balance}
                />
              </div>
              <p className="text-xs text-gray-500">
                Maximum: ₦{balance.toFixed(2)}
              </p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Processing...' : 'Withdraw Funds'}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Zakat, donations, and withdrawals
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
                          transaction.type === 'zakat'
                            ? 'bg-green-100'
                            : transaction.type === 'consultation'
                            ? 'bg-emerald-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        {transaction.type === 'zakat' ? (
                          <Heart className="h-4 w-4 text-green-600" />
                        ) : transaction.type === 'consultation' ? (
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.type === 'zakat' ? 'Zakat/Donation - ' : transaction.type === 'consultation' ? 'Consultation Fee - ' : ''}{transaction.donorName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        transaction.type === 'zakat'
                          ? 'text-green-600'
                          : transaction.type === 'consultation'
                          ? 'text-emerald-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {transaction.type === 'withdrawal' ? '-' : '+'}₦
                      {transaction.amount.toFixed(2)}
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
