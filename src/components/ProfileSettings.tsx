import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Camera, Shield, ArrowLeft } from 'lucide-react'
import { notifyScholarAvailable } from '../utils/pushNotifications'

export const ProfileSettings: React.FC = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Profile picture state
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Pricing fields for scholars/imams
  const [consultationFee, setConsultationFee] = useState(0)
  const [consultationDuration, setConsultationDuration] = useState(30)
  const [livestreamFee, setLivestreamFee] = useState(0)
  const [liveConsultationFee, setLiveConsultationFee] = useState(0)
  const [isOnline, setIsOnline] = useState(false)
  const [yearsOfExperience, setYearsOfExperience] = useState(0)
  const [consultationDescription, setConsultationDescription] = useState('')
  
  // Bank account fields for withdrawals
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([])
  const [verifyingAccount, setVerifyingAccount] = useState(false)
  
  const [verificationStatus, setVerificationStatus] = useState({
    phone_verified: false,
    email_verified: false,
    face_verified: false,
    certificate_verified: false,
    smileid_verified: false
  })

  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phone_number || '')
      setAvatarUrl(profile.avatar_url || profile.profile_picture_url || '')
      setConsultationFee(profile.consultation_fee || 0)
      setConsultationDuration(profile.consultation_duration || 30)
      setLivestreamFee(profile.livestream_fee || 0)
      setLiveConsultationFee(profile.live_consultation_fee || 0)
      setIsOnline(profile.is_online || false)
      setYearsOfExperience(profile.years_of_experience || 0)
      setConsultationDescription(profile.consultation_description || '')
      setBankAccountNumber(profile.bank_account_number || '')
      setBankCode(profile.bank_code || '')
      setBankName(profile.bank_name || '')
      setBankAccountName(profile.bank_account_name || '')
      setVerificationStatus({
        phone_verified: profile.phone_verified || false,
        email_verified: profile.email_verified || false,
        face_verified: profile.face_verified || false,
        certificate_verified: profile.certificate_verified || false,
        smileid_verified: profile.smileid_verified || false
      })
    }
    // Fetch Nigerian banks
    fetchNigerianBanks()
  }, [profile])

  const fetchNigerianBanks = async () => {
    try {
      const response = await fetch('https://api.paystack.co/bank?currency=NGN')
      const data = await response.json()
      if (data.status && data.data) {
        // Filter out duplicates by bank code
        const uniqueBanks = data.data.reduce((acc: Array<{ name: string; code: string }>, bank: any) => {
          if (!acc.find(b => b.code === bank.code)) {
            acc.push({ name: bank.name, code: bank.code })
          }
          return acc
        }, [])
        setBanks(uniqueBanks)
      }
    } catch (error) {
      console.error('Error fetching banks:', error)
    }
  }

  const verifyBankAccount = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.length !== 10 || !bankCode) return
    
    setVerifyingAccount(true)
    setMessage('')
    
    try {
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
          }
        }
      )
      
      const data = await response.json()
      
      if (data.status && data.data) {
        setBankAccountName(data.data.account_name)
        setMessage(`✓ Account verified: ${data.data.account_name}`)
      } else {
        setMessage('Could not verify account. Please check account number and bank.')
        setBankAccountName('')
      }
    } catch (error) {
      console.error('Error verifying account:', error)
      setMessage('Error verifying account. Please try again.')
    } finally {
      setVerifyingAccount(false)
    }
  }

  const handleSavePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      setMessage('Please enter a phone number')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', profile?.id || '')

      if (error) throw error

      setMessage('Phone number updated successfully!')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile?.id) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Error: Image must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage('Error: Please upload an image file')
      return
    }

    setUploadingAvatar(true)
    setMessage('')

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          profile_picture_url: publicUrl
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setMessage('✅ Profile picture updated successfully!')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setMessage(`Error: ${error.message}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSavePricing = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          consultation_fee: consultationFee,
          consultation_duration: consultationDuration,
          livestream_fee: livestreamFee,
          live_consultation_fee: liveConsultationFee,
          years_of_experience: yearsOfExperience,
          consultation_description: consultationDescription
        })
        .eq('id', profile?.id || '')

      if (error) throw error

      setMessage('Pricing and duration updated successfully!')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async () => {
    setLoading(true)
    setMessage('')

    try {
      const newStatus = !isOnline
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: newStatus })
        .eq('id', profile?.id || '')

      if (error) throw error

      setIsOnline(newStatus)
      setMessage(`Availability set to ${newStatus ? 'Online' : 'Offline'}`)
      
      // Notify all members when scholar goes online
      if (newStatus && profile) {
        await notifyScholarAvailable(
          profile.id,
          profile.full_name || 'Scholar',
          yearsOfExperience,
          profile.specializations || []
        )
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBankAccount = async () => {
    if (!bankAccountNumber || !bankCode || !bankName || !bankAccountName) {
      setMessage('Please fill in all bank account fields')
      return
    }

    if (bankAccountNumber.length !== 10) {
      setMessage('Account number must be exactly 10 digits')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      console.log('Saving bank account:', {
        bank_account_number: bankAccountNumber.trim(),
        bank_code: bankCode.trim(),
        bank_name: bankName.trim(),
        bank_account_name: bankAccountName.trim()
      })

      const { error } = await supabase
        .from('profiles')
        .update({
          bank_account_number: bankAccountNumber.trim(),
          bank_code: bankCode.trim(),
          bank_name: bankName.trim(),
          bank_account_name: bankAccountName.trim()
        })
        .eq('id', profile?.id || '')

      if (error) {
        console.error('❌ Bank account save error:', error)
        throw error
      }

      console.log('✅ Bank account saved successfully')
      setMessage('✅ Bank account details saved successfully!')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhone = async () => {
    if (!phoneNumber.trim()) {
      setMessage('Please save a phone number first')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // In production, integrate with SMS verification service (Twilio, etc.)
      // For now, create a verification record
      const { error } = await supabase
        .from('verification_data')
        .insert({
          user_id: profile?.id,
          verification_type: 'phone',
          verification_provider: 'manual',
          status: 'pending',
          data: { phone_number: phoneNumber }
        })

      if (error) throw error

      setMessage('Phone verification initiated. Check your SMS for verification code.')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Supabase handles email verification via magic link
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: profile?.email || ''
      })

      if (error) throw error

      setMessage('Verification email sent! Please check your inbox.')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSmileIDVerification = async () => {
    setLoading(true)
    setMessage('')

    try {
      const partnerId = import.meta.env.VITE_SMILEID_PARTNER_ID
      
      if (!partnerId) {
        throw new Error('Smile ID not configured. Please contact support.')
      }

      // Initialize Smile ID Web SDK
      const jobId = `job_${Date.now()}_${profile?.id?.substring(0, 8)}`
      const userId = profile?.id || ''
      
      // Create verification record first
      const { error: dbError } = await supabase
        .from('verification_data')
        .insert({
          user_id: profile?.id,
          verification_type: 'smileid',
          verification_provider: 'smile_identity',
          status: 'pending',
          data: {
            job_id: jobId,
            phone: phoneNumber,
            email: profile?.email,
            initiated_at: new Date().toISOString()
          }
        })

      if (dbError) throw dbError

      // Load Smile ID Web SDK
      const script = document.createElement('script')
      script.src = 'https://cdn.smileidentity.com/inline/v1/inline.min.js'
      script.async = true
      
      script.onload = () => {
        // @ts-ignore - SmileIdentity SDK
        const SmileIdentity = window.SmileIdentity
        
        SmileIdentity.configure({
          partner_id: partnerId,
          job_id: jobId,
          user_id: userId,
          job_type: 4, // 4 = Enhanced KYC with selfie
          product: 'identity_verification',
          callback_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smileid-callback`,
          
          // Callback when verification is complete
          onComplete: async (result: any) => {
            console.log('Smile ID verification complete:', result)
            
            // Update verification record
            await supabase
              .from('verification_data')
              .update({
                status: 'completed',
                data: {
                  job_id: jobId,
                  phone: phoneNumber,
                  email: profile?.email,
                  result: result,
                  completed_at: new Date().toISOString()
                }
              })
              .eq('user_id', profile?.id)
              .eq('verification_type', 'smileid')
            
            setMessage('✅ Verification submitted successfully! Review typically takes 1-2 business days.')
          },
          
          onError: (error: any) => {
            console.error('Smile ID error:', error)
            setMessage(`Verification error: ${error.message || 'Please try again'}`)
          },
          
          onClose: () => {
            console.log('Smile ID modal closed')
            setLoading(false)
          }
        })
        
        // Launch the verification modal
        SmileIdentity.launch()
      }
      
      script.onerror = () => {
        throw new Error('Failed to load Smile ID SDK. Please check your connection.')
      }
      
      document.body.appendChild(script)

    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
      setLoading(false)
    }
  }

  const handleUploadCertificate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('')

    try {
      // Upload certificate to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}_certificate_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Create verification record
      const { error: insertError } = await supabase
        .from('verification_data')
        .insert({
          user_id: profile?.id,
          verification_type: 'certificate',
          verification_provider: 'manual',
          status: 'pending',
          data: {
            file_name: fileName,
            file_size: file.size,
            file_type: file.type
          }
        })

      if (insertError) throw insertError

      setMessage('Certificate uploaded successfully! Awaiting admin review.')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isScholarOrImam = profile?.role === 'scholar' || profile?.role === 'imam'

  return (
    <>
      {/* Green background for status bar area */}
      <div 
        className="fixed top-0 left-0 right-0 bg-emerald-600 z-40"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4 pb-4 border-b">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 shadow-lg">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">
                {uploadingAvatar ? 'Uploading...' : 'Click camera icon to upload photo'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <Input value={profile?.full_name || ''} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input value={profile?.email || ''} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <Input 
              value={
                profile?.role === 'user' ? 'Member' : 
                profile?.role === 'scholar' ? 'Scholar' : 
                profile?.role === 'imam' ? 'Imam' : 
                profile?.role || ''
              } 
              disabled 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <div className="flex flex-wrap gap-2">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="flex-1 min-w-[200px]"
              />
              <Button onClick={handleSavePhoneNumber} disabled={loading} className="min-w-[80px]">
                Save
              </Button>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded ${
              message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identity Verification - Scholars/Imams Only */}
      {isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>Identity Verification</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Verify your identity to become a trusted scholar/imam on the platform
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Verification Status */}
              <div className={`p-4 rounded-lg ${verificationStatus.smileid_verified ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  {verificationStatus.smileid_verified ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-blue-600" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {verificationStatus.smileid_verified ? 'Verified ✓' : 'Not Verified'}
                    </p>
                    <p className="text-sm text-gray-700">
                      {verificationStatus.smileid_verified
                        ? 'Your identity has been verified'
                        : 'Click below to start verification process'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verify Identity Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSmileIDVerification}
                  disabled={loading || verificationStatus.smileid_verified}
                  className="w-full"
                  size="lg"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  {verificationStatus.smileid_verified
                    ? 'Verified'
                    : 'Verify Identity'}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Powered by Smile ID - Secure identity verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Settings for Scholars/Imams */}
      {isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>Service Pricing & Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Availability Toggle */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Availability Status</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {isOnline 
                      ? 'You are currently available for consultations' 
                      : 'You are currently offline'}
                  </p>
                </div>
                <Button
                  onClick={handleToggleAvailability}
                  disabled={loading}
                  variant={isOnline ? 'default' : 'outline'}
                  className={isOnline ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Set Your Fees</h4>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Consultation Fee (₦)
              </label>
              <Input
                type="number"
                min="0"
                value={consultationFee}
                onChange={(e) => setConsultationFee(Number(e.target.value))}
                placeholder="e.g., 5000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fee for private 1-on-1 consultation sessions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Consultation Duration (minutes)
              </label>
              <Input
                type="number"
                min="5"
                step="5"
                value={consultationDuration}
                onChange={(e) => setConsultationDuration(Number(e.target.value))}
                placeholder="e.g., 30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default duration for consultation sessions (e.g., 15min/1000₦, 30min/2000₦)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Livestream Access Fee (₦)
              </label>
              <Input
                type="number"
                min="0"
                value={livestreamFee}
                onChange={(e) => setLivestreamFee(Number(e.target.value))}
                placeholder="e.g., 1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fee for viewers to access your paid livestreams (0 for free)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Live Consultation Fee (₦)
              </label>
              <Input
                type="number"
                min="0"
                value={liveConsultationFee}
                onChange={(e) => setLiveConsultationFee(Number(e.target.value))}
                placeholder="e.g., 2000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fee for live consultation requests during streams
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Professional Information</h4>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Years of Experience
              </label>
              <Input
                type="number"
                min="0"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many years have you been providing Islamic guidance?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Consultation Description
              </label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[80px]"
                value={consultationDescription}
                onChange={(e) => setConsultationDescription(e.target.value)}
                placeholder="e.g., Experienced Islamic scholar providing consultation on Quran interpretation, Hadith studies, and spiritual guidance."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                Brief description shown to members when you're available (max 200 characters)
              </p>
            </div>

            <Button 
              onClick={handleSavePricing} 
              disabled={loading}
              className="w-full"
            >
              Save Settings
            </Button>

            {message && (
              <div className={`p-3 rounded ${
                message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Account for Withdrawals (Scholars/Imams) */}
      {isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Account for Withdrawals</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Add your bank account details to receive withdrawal payments via Paystack
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Bank
              </label>
              <select
                value={bankCode}
                onChange={(e) => {
                  const selectedBank = banks.find(b => b.code === e.target.value)
                  setBankCode(e.target.value)
                  setBankName(selectedBank?.name || '')
                  if (bankAccountNumber.length === 10 && e.target.value) {
                    verifyBankAccount(bankAccountNumber, e.target.value)
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">-- Select your bank --</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Account Number
              </label>
              <Input
                type="text"
                maxLength={10}
                value={bankAccountNumber}
                onChange={(e) => {
                  setBankAccountNumber(e.target.value)
                  if (e.target.value.length === 10 && bankCode) {
                    verifyBankAccount(e.target.value, bankCode)
                  }
                }}
                placeholder="Enter 10-digit account number"
              />
              <p className="text-xs text-gray-500 mt-1">
                {verifyingAccount && 'Verifying account...'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Account Name
              </label>
              <Input
                type="text"
                value={bankAccountName}
                disabled
                placeholder="Will be auto-filled after verification"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Automatically verified from your bank
              </p>
            </div>

            <Button 
              onClick={handleSaveBankAccount} 
              disabled={loading || !bankAccountName}
              className="w-full"
            >
              Save Bank Account
            </Button>

            {message && (
              <div className={`p-3 rounded ${
                message.includes('Error') || message.includes('Could not') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Status for Scholars */}
      {profile?.role === 'scholar' && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Completed Consultations:</span>
                <span className="font-semibold">{profile.completed_consultations_count || 0}</span>
              </div>
              
              {(profile.completed_consultations_count || 0) >= 2 && !profile.is_subscribed && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">
                    ⚠️ Subscription Required
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have completed 2+ consultations. Please subscribe to continue offering services.
                  </p>
                  <Button className="mt-3" size="sm">
                    Subscribe Now
                  </Button>
                </div>
              )}

              {profile.is_subscribed && (
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Active Subscription
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Expires: {profile.subscription_expires_at
                      ? new Date(profile.subscription_expires_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Deletion - Available to All Users */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-900 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Delete Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => navigate('/delete-account')}
              className="w-full sm:w-auto"
            >
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
