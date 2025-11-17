import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TermsOfService: React.FC = () => {
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
          <h1 className="text-xl font-bold">Terms of Service</h1>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Terms of Service for Islamic Community App</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: November 17, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2 className="text-lg font-bold mt-4 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Islamic Community App, you agree to be bound by these Terms of Service. 
              If you disagree with any part of these terms, you may not access the app.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">2. Description of Service</h2>
            <p>
              The Islamic Community App provides the following services:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access to the Holy Quran with audio recitation</li>
              <li>Prayer times based on your location</li>
              <li>Qibla direction compass</li>
              <li>Scholar/Imam consultations and bookings</li>
              <li>Islamic livestream services</li>
              <li>Zakat donation management</li>
              <li>Community activities and events</li>
              <li>Islamic educational content</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">3. User Accounts</h2>
            <h3 className="font-semibold mt-3 mb-1">3.1 Account Creation</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must verify your email address before using the app</li>
              <li>You must be at least 13 years old to create an account</li>
            </ul>

            <h3 className="font-semibold mt-3 mb-1">3.2 Account Types</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Community Member:</strong> Access to all member features</li>
              <li><strong>Scholar/Imam:</strong> Additional features for providing services and livestreams (requires verification)</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">4. User Conduct</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the app for any unlawful purpose</li>
              <li>Post offensive, abusive, or inappropriate content</li>
              <li>Impersonate others or provide false information</li>
              <li>Harass, threaten, or discriminate against other users</li>
              <li>Share content that violates Islamic principles</li>
              <li>Attempt to hack or compromise the app's security</li>
              <li>Use automated tools to access the app (bots, scrapers)</li>
              <li>Spam other users with unwanted messages</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">5. Scholar/Imam Responsibilities</h2>
            <p>If you register as a scholar or imam, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide authentic Islamic knowledge and guidance</li>
              <li>Maintain professional conduct in all consultations</li>
              <li>Verify your credentials when requested</li>
              <li>Respect appointment times and commitments</li>
              <li>Keep consultation content confidential</li>
              <li>Follow Islamic ethics and principles in all interactions</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">6. Consultations and Bookings</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Consultations are subject to scholar availability</li>
              <li>You may cancel bookings according to the cancellation policy</li>
              <li>Consultation content is confidential between parties</li>
              <li>The app is not responsible for the content or quality of consultations</li>
              <li>Disputes should be resolved amicably or through app support</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">7. Zakat Donations</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Donations are processed securely through trusted payment gateways</li>
              <li>Donation records are maintained for transparency</li>
              <li>Refunds are subject to Islamic principles and verification</li>
              <li>The app ensures donations reach intended recipients</li>
              <li>Tax receipts may be provided where applicable</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">8. Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The app's design, logo, and original content are our property</li>
              <li>Quran text and audio are used with appropriate permissions</li>
              <li>You retain rights to content you create (reviews, messages)</li>
              <li>By posting content, you grant us a license to use it within the app</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">9. Privacy and Data Protection</h2>
            <p>
              Your use of the app is also governed by our Privacy Policy. Please review it to understand 
              how we collect, use, and protect your information.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">10. Disclaimers</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The app is provided "as is" without warranties</li>
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>Prayer times and Qibla directions are calculated estimates</li>
              <li>Scholar advice is for guidance only; consult qualified experts for important matters</li>
              <li>We are not responsible for third-party content or services</li>
            </ul>

            <h2 className="text-lg font-bold mt-4 mb-2">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of the app.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">12. Account Termination</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Suspend or terminate accounts that violate these terms</li>
              <li>Remove content that violates our policies</li>
              <li>Refuse service to anyone for any reason</li>
            </ul>
            <p className="mt-2">You may delete your account at any time through the app settings.</p>

            <h2 className="text-lg font-bold mt-4 mb-2">13. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Continued use of the app after changes constitutes 
              acceptance of the new terms. We will notify users of significant changes.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">14. Governing Law</h2>
            <p>
              These terms are governed by applicable laws. Disputes will be resolved through good faith 
              negotiation or appropriate legal channels in accordance with Islamic principles where possible.
            </p>

            <h2 className="text-lg font-bold mt-4 mb-2">15. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us through the app's support 
              section or email support@islamicapp.com (update with your actual contact).
            </p>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800">
                ☪️ Islamic Values
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This app is designed to serve the Muslim community with respect for Islamic principles. 
                All users are expected to maintain Islamic ethics and conduct in their interactions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
