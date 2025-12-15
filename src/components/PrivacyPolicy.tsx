import React from 'react'
import { Button } from './ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate()
  const privacyPolicyUrl = 'https://yellow-winifred-49.tiiny.site/'

  return (
    &lt;div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col"&gt;
      &lt;div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sticky top-0 z-10 shadow-lg"&gt;
        &lt;div className="flex items-center justify-between"&gt;
          &lt;div className="flex items-center"&gt;
            &lt;Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-emerald-500 mr-2"
              onClick={() =&gt; navigate(-1)}
            &gt;
              &lt;ArrowLeft className="h-6 w-6" /&gt;
            &lt;/Button&gt;
            &lt;h1 className="text-xl font-bold"&gt;Privacy Policy&lt;/h1&gt;
          &lt;/div&gt;
          &lt;a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm hover:underline"
          &gt;
            &lt;ExternalLink className="h-4 w-4" /&gt;
            &lt;span className="hidden sm:inline"&gt;Open in new tab&lt;/span&gt;
          &lt;/a&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="flex-1 w-full"&gt;
        &lt;iframe
          src={privacyPolicyUrl}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 64px)' }}
          title="Privacy Policy"
        /&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  )
}
