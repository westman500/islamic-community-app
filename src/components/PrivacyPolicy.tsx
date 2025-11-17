import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-emerald-500 mr-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Privacy Policy for Islamic Community App</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: November 17, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2 className="text-lg font-bold mt-4 mb-2">1. Introduction</h2>
            <p>
              Welcome to the Islamic Community App. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">2. Information We Collect</h2>
            <h3 className="font-semibold mt-3 mb-1">2.1 Personal Information</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Email address (for account creation and authentication)</li>
              <li>Full name</li>
              <li>Profile information (role, bio, specializations for scholars)</li>
              <li>Location data (for prayer times and Qibla direction)</li>
            </ul>

            <h3 className="font-semibold mt-3 mb-1">2.2 Usage Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>App usage statistics</li>
              <li>Consultation bookings and messages</li>
              <li>Livestream participation</li>
              <li>Prayer service attendance</li>
              <li>Zakat donations (transaction records)</li>
            </ul>

            <h3 className="font-semibold mt-3 mb-1">2.3 Technical Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Device information</li>
              <li>IP address</li>
              <li>App version</li>
              <li>Device orientation (for Qibla compass)</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To provide and maintain our service</li>
              <li>To authenticate your account and verify your identity</li>
              <li>To calculate accurate prayer times based on your location</li>
              <li>To enable scholar-member consultations and bookings</li>
              <li>To facilitate livestream services</li>
              <li>To process Zakat donations securely</li>
              <li>To improve our app features and user experience</li>
              <li>To send important notifications about your bookings and activities</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Encrypted data transmission using HTTPS/SSL</li>
              <li>Secure authentication via Supabase Auth</li>
              <li>Row-level security policies on our database</li>
              <li>Regular security audits and updates</li>
              <li>Password hashing and secure storage</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">5. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share data only in these circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>With scholars/imams when you book consultations</li>
              <li>With payment processors for Zakat donations (securely)</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Opt-out of non-essential notifications</li>
              <li>Export your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">7. Location Services</h2>
            <p>
              We use your location to provide accurate prayer times and Qibla direction. You can disable location services 
              in your device settings, but this will affect the accuracy of these features.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">8. Children's Privacy</h2>
            <p>
              Our app is not intended for children under 13 years of age. We do not knowingly collect personal information 
              from children under 13.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new 
              policy in the app and updating the "Last Updated" date.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">10. Contact Us</h2>
            <p>
              If you have questions about this privacy policy or our data practices, please contact us through the app's 
              support section or email us at support@islamicapp.com (update with your actual contact).
            </p>

            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-semibold text-emerald-800">
                📧 Email Confirmation Required
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                By creating an account, you consent to receiving transactional emails including account verification, 
                booking confirmations, and important service updates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
