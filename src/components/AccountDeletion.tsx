import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { AlertTriangle, Trash2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

export const AccountDeletion: React.FC = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'warning' | 'confirm'>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type the exact confirmation text')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🗑️ Initiating account deletion for user:', profile?.id)
      
      // Call Edge Function to delete account (has admin privileges to delete auth.users)
      const { data, error: functionError } = await supabase.functions.invoke(
        'delete-user-account',
        {
          body: { userId: profile?.id }
        }
      )

      if (functionError) {
        console.error('❌ Edge function error:', functionError)
        
        // Fallback: Try direct database deletion (won't delete from auth.users)
        console.log('⚠️ Edge function failed, attempting database-only deletion...')
        const { error: dbError } = await supabase.rpc('delete_user_account', {
          user_id_to_delete: profile?.id
        })

        if (dbError) {
          console.error('❌ Database deletion error:', dbError)
          throw new Error(`Failed to delete account: ${dbError.message}`)
        }

        console.log('⚠️ Database records deleted, but auth user may still exist. Please contact support.')
        showNotification('Account data deleted, but authentication may need manual cleanup', 'warning')
      } else {
        console.log('✅ Account fully deleted:', data)
        showNotification('Account deleted successfully', 'success')
      }

      // Sign out immediately and redirect
      console.log('🚪 Signing out...')
      await signOut()
      navigate('/signin')
    } catch (err: any) {
      console.error('❌ Error deleting account:', err)
      setError('Failed to delete account. Please try again or contact support.')
      setLoading(false)
    }
  }

  if (step === 'warning') {
    return (
      <MobileLayout showBackButton onBackClick={() => navigate('/profile-settings')}>
        <div className="w-full max-w-2xl mx-auto p-4">
          <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <CardTitle className="text-red-900">Delete Account</CardTitle>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold text-yellow-900 mb-2">
                ⚠️ Warning: The following data will be permanently deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>Your profile and account information</li>
                <li>All consultations (pending and completed)</li>
                <li>All messages and communications</li>
                <li>Reviews you've written and received</li>
                <li>Livestream history and recordings</li>
                <li>Zakat donations and payment history</li>
                <li>All notifications and preferences</li>
                <li>Blocked users and reports</li>
                <li>Subscriptions and access permissions</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900 mb-2">
                💡 Before you proceed:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Complete or cancel all pending consultations</li>
                <li>Download any important conversation history</li>
                <li>Cancel any active subscriptions</li>
                <li>Withdraw any remaining account balance (if applicable)</li>
              </ul>
            </div>

            {profile?.role === 'scholar' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">
                  📚 Scholar Account Notice:
                </p>
                <p className="text-sm text-purple-800">
                  Your scholar profile, ratings, and reviews will be permanently removed. 
                  Members will no longer be able to book consultations or view your livestreams.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/profile-settings')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep('confirm')}
                className="flex-1"
              >
                I Understand, Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout showBackButton onBackClick={() => setStep('warning')}>
      <div className="w-full max-w-md mx-auto p-4">
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-600" />
            <div>
              <CardTitle className="text-red-900">Final Confirmation</CardTitle>
              <p className="text-sm text-red-700 mt-1">
                Type to confirm account deletion
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-700 mb-4">
              To confirm deletion of your account and all associated data, please type:
            </p>
            <p className="text-center font-bold text-lg mb-4 p-3 bg-gray-100 rounded-lg">
              DELETE MY ACCOUNT
            </p>
            <Input
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError('')
              }}
              placeholder="Type here..."
              className="text-center font-semibold"
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-semibold">
              Last chance: This will immediately and permanently delete your account
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('warning')}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading || confirmText !== 'DELETE MY ACCOUNT'}
              className="flex-1"
            >
              {loading ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </MobileLayout>
  )
}
