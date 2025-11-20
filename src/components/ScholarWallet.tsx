import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { Heart, DollarSign, TrendingUp, ArrowDownToLine, Eye, EyeOff } from 'lucide-react'
import { MobileLayout } from './MobileLayout'

interface ZakatTransaction {
  id: string
  amount: number
  donorName: string
  date: string
  type: 'zakat' | 'withdrawal'
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
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      // TODO: Replace with actual API call to fetch wallet balance and transactions
      // const response = await apiCall(`scholar-wallet/${profile?.id}`)
      // setBalance(response.balance)
      // setTransactions(response.transactions)
      
      // Mock data
      setBalance(1250)
      setTransactions([
        {
          id: 'txn_1',
          amount: 50,
          donorName: 'Ahmed Ali',
          date: '2025-11-19',
          type: 'zakat'
        },
        {
          id: 'txn_2',
          amount: 100,
          donorName: 'Fatima Hassan',
          date: '2025-11-18',
          type: 'zakat'
        },
        {
          id: 'txn_3',
          amount: 500,
          donorName: 'Bank Transfer',
          date: '2025-11-17',
          type: 'withdrawal'
        },
        {
          id: 'txn_4',
          amount: 75,
          donorName: 'Yusuf Ibrahim',
          date: '2025-11-16',
          type: 'zakat'
        },
        {
          id: 'txn_5',
          amount: 200,
          donorName: 'Aisha Mohammed',
          date: '2025-11-15',
          type: 'zakat'
        }
      ])
    } catch (err) {
      console.error('Error fetching wallet data:', err)
      setError('Failed to load wallet data')
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    
    if (!amount || amount < 1) {
      setError('Please enter a valid amount (minimum $1)')
      return
    }

    if (amount > balance) {
      setError('Insufficient balance')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // TODO: Integrate with payment gateway for withdrawal
      // 1. Verify scholar bank account details
      // 2. Initiate transfer
      // 3. Record withdrawal in database
      // 4. Update balance
      
      // Mock success for now
      setTimeout(() => {
        setBalance(prev => prev - amount)
        setTransactions(prev => [
          {
            id: `txn_${Date.now()}`,
            amount,
            donorName: 'Bank Transfer',
            date: new Date().toISOString().split('T')[0],
            type: 'withdrawal'
          },
          ...prev
        ])
        setSuccess(`Successfully withdrew $${amount}`)
        setWithdrawAmount('')
        setLoading(false)
      }, 1500)
    } catch (err) {
      setError('Failed to process withdrawal')
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
    <MobileLayout title="Manage Zakat and Donations">
      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6" />
                <CardTitle className="text-white">Zakat & Donations Balance</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-emerald-600"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {showBalance ? `$${balance.toFixed(2)}` : '****'}
            </div>
            <p className="text-emerald-100 text-sm">
              From livestream tips, zakat contributions, and charitable donations
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
                  ${totalZakat.toFixed(2)}
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
                  ${totalWithdrawals.toFixed(2)}
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
              <label className="text-sm font-medium">Amount ($)</label>
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
                Maximum: ${balance.toFixed(2)}
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
                            : 'bg-blue-100'
                        }`}
                      >
                        {transaction.type === 'zakat' ? (
                          <Heart className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.type === 'zakat' ? 'Zakat/Donation - ' : ''}{transaction.donorName}
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
                          : 'text-blue-600'
                      }`}
                    >
                      {transaction.type === 'zakat' ? '+' : '-'}$
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
