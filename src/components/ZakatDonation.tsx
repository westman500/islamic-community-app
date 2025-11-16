import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { usePermissions } from './ProtectedRoute'
import { Heart, DollarSign } from 'lucide-react'

interface Scholar {
  id: string
  name: string
  specialization: string
  avatar_url?: string
}

export const ZakatDonation: React.FC = () => {
  const permissions = usePermissions()
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
      // TODO: Replace with actual API call
      // const response = await apiCall('scholars')
      // setScholars(response.scholars)
      
      // Mock data
      setScholars([
        {
          id: 'scholar_1',
          name: 'Imam Abdullah',
          specialization: 'Quran & Tafsir',
        },
        {
          id: 'scholar_2',
          name: 'Sheikh Muhammad',
          specialization: 'Fiqh & Hadith',
        },
      ])
    } catch (err) {
      console.error('Error fetching scholars:', err)
    }
  }

  const handleDonate = async () => {
    if (!permissions.canDonate) {
      setError('Only members can make donations')
      return
    }

    if (!selectedScholar) {
      setError('Please select a scholar')
      return
    }

    const donationAmount = parseFloat(amount)
    if (!donationAmount || donationAmount < 1) {
      setError('Please enter a valid amount (minimum $1)')
      return
    }

    setError('')
    setLoading(true)

    try {
      // TODO: Integrate with Paystack payment
      // 1. Initialize Paystack transaction
      // 2. Redirect to payment page
      // 3. Handle callback
      // 4. Record donation in database
      
      // Mock success for now
      setTimeout(() => {
        setSuccess(true)
        setLoading(false)
        setAmount('')
        setSelectedScholar(null)
        
        setTimeout(() => setSuccess(false), 5000)
      }, 2000)

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

  if (!permissions.canDonate) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-2">
              Access Denied: Only members can make Zakat donations.
            </p>
            <p className="text-sm text-muted-foreground">
              Scholars and imams cannot donate. They can receive donations from members.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Zakat & Donations
          </CardTitle>
          <CardDescription>
            Support our scholars and imams with your Zakat and voluntary donations
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
                  Donation Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum donation: $1.00
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
                    ${value}
                  </Button>
                ))}
              </div>

              {/* Information */}
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">About Zakat & Donations</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 100% of your donation goes to the selected scholar</li>
                  <li>• Secure payment processing via Paystack</li>
                  <li>• Tax receipts available upon request</li>
                  <li>• Zakat eligible donations are clearly marked</li>
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
    </div>
  )
}
