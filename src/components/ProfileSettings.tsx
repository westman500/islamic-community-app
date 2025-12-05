import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { CheckCircle, XCircle, Phone, Mail, Camera, FileText, Shield } from 'lucide-react'

export const ProfileSettings: React.FC = () => {
  const { profile } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Pricing fields for scholars/imams
  const [consultationFee, setConsultationFee] = useState(0)
  const [livestreamFee, setLivestreamFee] = useState(0)
  const [liveConsultationFee, setLiveConsultationFee] = useState(0)
  
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
      setConsultationFee(profile.consultation_fee || 0)
      setLivestreamFee(profile.livestream_fee || 0)
      setLiveConsultationFee(profile.live_consultation_fee || 0)
      setVerificationStatus({
        phone_verified: profile.phone_verified || false,
        email_verified: profile.email_verified || false,
        face_verified: profile.face_verified || false,
        certificate_verified: profile.certificate_verified || false,
        smileid_verified: profile.smileid_verified || false
      })
    }
  }, [profile])

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

  const handleSavePricing = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          consultation_fee: consultationFee,
          livestream_fee: livestreamFee,
          live_consultation_fee: liveConsultationFee
        })
        .eq('id', profile?.id || '')

      if (error) throw error

      setMessage('Pricing updated successfully!')
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
      // In production, integrate with Smile Identity API
      // For now, simulate the process
      alert('SMILE ID Verification:\n\n' +
        '1. You will be redirected to Smile Identity\n' +
        '2. Provide your phone number\n' +
        '3. Provide your email\n' +
        '4. Take a selfie for face verification\n' +
        '5. Upload your certificates (Ijazah, etc.)\n\n' +
        'This process typically takes 1-2 business days for review.'
      )

      // Create verification record
      const { error } = await supabase
        .from('verification_data')
        .insert({
          user_id: profile?.id,
          verification_type: 'smileid',
          verification_provider: 'smile_identity',
          status: 'pending',
          data: {
            phone: phoneNumber,
            email: profile?.email,
            initiated_at: new Date().toISOString()
          }
        })

      if (error) throw error

      setMessage('SMILE ID verification initiated. You will be notified once approved.')
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
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
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Input value={profile?.role || ''} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <div className="flex gap-2">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
              />
              <Button onClick={handleSavePhoneNumber} disabled={loading}>
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

      {/* Verification Status for Members */}
      {!isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Status (Members)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <div>
                  <p className="font-medium">Phone Verification</p>
                  <p className="text-sm text-gray-600">Verify your phone number via SMS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {verificationStatus.phone_verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                <Button
                  onClick={handleVerifyPhone}
                  disabled={loading || verificationStatus.phone_verified}
                  size="sm"
                >
                  {verificationStatus.phone_verified ? 'Verified' : 'Verify'}
                </Button>
              </div>
            </div>

            {/* Email Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <div>
                  <p className="font-medium">Email Verification</p>
                  <p className="text-sm text-gray-600">Verify your email address</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {verificationStatus.email_verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                <Button
                  onClick={handleVerifyEmail}
                  disabled={loading || verificationStatus.email_verified}
                  size="sm"
                >
                  {verificationStatus.email_verified ? 'Verified' : 'Verify'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMILE ID Verification for Scholars/Imams */}
      {isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>SMILE ID Verification (Scholars & Imams)</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Complete all verification steps to become a verified scholar/imam on the platform
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SMILE ID Overall Status */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-semibold">SMILE ID Verification Status</p>
                  <p className="text-sm text-gray-700">
                    {verificationStatus.smileid_verified
                      ? '✓ Fully Verified'
                      : 'Verification Required'}
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <div>
                  <p className="font-medium">Phone Verification</p>
                  <p className="text-sm text-gray-600">Verify phone via SMILE ID</p>
                </div>
              </div>
              {verificationStatus.phone_verified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/* Email Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <div>
                  <p className="font-medium">Email Verification</p>
                  <p className="text-sm text-gray-600">Verify email via SMILE ID</p>
                </div>
              </div>
              {verificationStatus.email_verified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/* Face Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5" />
                <div>
                  <p className="font-medium">Face Verification</p>
                  <p className="text-sm text-gray-600">Biometric face scan via SMILE ID</p>
                </div>
              </div>
              {verificationStatus.face_verified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/* Certificate Verification */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div>
                  <p className="font-medium">Certificate Verification</p>
                  <p className="text-sm text-gray-600">Upload Ijazah or credentials</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {verificationStatus.certificate_verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadCertificate}
                    className="hidden"
                    disabled={loading}
                  />
                  <span>
                    <Button size="sm" disabled={loading} type="button">
                      Upload
                    </Button>
                  </span>
                </label>
              </div>
            </div>

            {/* Start SMILE ID Verification */}
            <div className="pt-4">
              <Button
                onClick={handleSmileIDVerification}
                disabled={loading || verificationStatus.smileid_verified}
                className="w-full"
                size="lg"
              >
                {verificationStatus.smileid_verified
                  ? '✓ SMILE ID Verified'
                  : 'Start SMILE ID Verification'}
              </Button>
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
      )}

      {/* Pricing Settings for Scholars/Imams */}
      {isScholarOrImam && (
        <Card>
          <CardHeader>
            <CardTitle>Service Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Button 
              onClick={handleSavePricing} 
              disabled={loading}
              className="w-full"
            >
              Save Pricing
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
    </div>
  )
}
