import { useState } from 'react'
import { X, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface ZakatModalProps {
  isOpen: boolean
  onClose: () => void
  scholarId: string
  streamTitle: string
}

const DONATION_AMOUNTS = [5, 10, 25, 50, 100]

export const ZakatModal = ({ isOpen, onClose, scholarId, streamTitle }: ZakatModalProps) => {
  const { profile } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleDonate = async () => {
    const amount = selectedAmount || parseFloat(customAmount)
    
    if (!amount || amount <= 0) {
      setError('Please select or enter a valid amount')
      return
    }

    if (!profile) {
      setError('You must be logged in to donate')
      return
    }

    setIsProcessing(true)
    setError('')
    setMessage('')

    try {
      // Check user balance
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', profile.id)
        .single()

      if (userError) throw userError

      const balance = userData.masjid_coin_balance || 0
      
      if (balance < amount) {
        setError(`Insufficient balance. You have ${balance} coins.`)
        setIsProcessing(false)
        return
      }

      // Use edge function to process zakat (bypasses RLS)
      const { data: zakatData, error: zakatError } = await supabase.functions.invoke('process-zakat', {
        body: {
          userId: profile.id,
          scholarId,
          amount,
          streamTitle
        }
      })

      if (zakatError) throw zakatError
      if (!zakatData?.success) throw new Error(zakatData?.error || 'Zakat processing failed')

      setMessage(`✅ Successfully donated ${amount} coins! May Allah accept your Zakat.`)
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
        setSelectedAmount(null)
        setCustomAmount('')
        setMessage('')
      }, 2000)

    } catch (err: any) {
      console.error('Donation error:', err)
      setError(err.message || 'Failed to process donation')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={isProcessing}
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Give Zakat During Stream
          </CardTitle>
          <CardDescription>
            Support this scholar and earn rewards
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Quick Amounts:</p>
            <div className="grid grid-cols-3 gap-2">
              {DONATION_AMOUNTS.map(amount => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedAmount(amount)
                    setCustomAmount('')
                    setError('')
                  }}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {amount} coins
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Or enter custom amount:</p>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
                setError('')
              }}
              placeholder="Enter amount"
              disabled={isProcessing}
              className="w-full px-3 py-2 border rounded-lg"
              min="1"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <Button
            onClick={handleDonate}
            disabled={isProcessing || (!selectedAmount && !customAmount)}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Donate Now'}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your donation will be recorded and the scholar will be notified
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
