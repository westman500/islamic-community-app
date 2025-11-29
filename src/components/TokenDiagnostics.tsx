import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { supabase } from '../utils/supabase/client'

export const TokenDiagnostics: React.FC = () => {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const runFullDiagnostic = async () => {
    setLoading(true)
    setResult('Running diagnostics...\n\n')
    
    try {
      // 1. Check authentication
      setResult(prev => prev + '1. Checking authentication...\n')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setResult(prev => prev + `   ❌ Session error: ${sessionError.message}\n\n`)
        setLoading(false)
        return
      }
      
      if (!session) {
        setResult(prev => prev + '   ❌ No active session - Please sign in\n\n')
        setLoading(false)
        return
      }
      
      setResult(prev => prev + `   ✅ Session active\n`)
      setResult(prev => prev + `   User ID: ${session.user.id}\n`)
      setResult(prev => prev + `   Email: ${session.user.email}\n\n`)
      
      // 2. Test edge function connectivity
      setResult(prev => prev + '2. Testing edge function connectivity...\n')
      const testChannel = `diagnostic_${Date.now()}`
      
      const start = performance.now()
      const { data, error } = await supabase.functions.invoke('generate-agora-token', {
        body: {
          channelName: testChannel,
          uid: session.user.id,
          role: 1,
          expirationTimeInSeconds: 3600,
          debug: true
        }
      })
      const duration = Math.round(performance.now() - start)
      
      if (error) {
        setResult(prev => prev + `   ❌ Edge function error (${duration}ms):\n`)
        setResult(prev => prev + `   ${error.message || JSON.stringify(error)}\n\n`)
        
        // Additional debugging
        setResult(prev => prev + '3. Debug information:\n')
        setResult(prev => prev + `   Error type: ${typeof error}\n`)
        setResult(prev => prev + `   Error keys: ${Object.keys(error).join(', ')}\n`)
        if (error.context) {
          setResult(prev => prev + `   Context: ${JSON.stringify(error.context, null, 2)}\n`)
        }
        
        setLoading(false)
        return
      }
      
      if (!data) {
        setResult(prev => prev + '   ❌ No data returned from edge function\n\n')
        setLoading(false)
        return
      }
      
      setResult(prev => prev + `   ✅ Edge function responded (${duration}ms)\n`)
      
      // 3. Check token
      setResult(prev => prev + '\n3. Validating token...\n')
      
      if (!data.token) {
        setResult(prev => prev + '   ❌ No token in response\n')
        setResult(prev => prev + `   Response: ${JSON.stringify(data, null, 2)}\n\n`)
        setLoading(false)
        return
      }
      
      setResult(prev => prev + `   ✅ Token generated\n`)
      setResult(prev => prev + `   Length: ${data.token.length} characters\n`)
      setResult(prev => prev + `   Preview: ${data.token.substring(0, 30)}...\n`)
      setResult(prev => prev + `   App ID: ${data.appId}\n`)
      
      if (data.breakdown) {
        setResult(prev => prev + `\n4. Token Details:\n`)
        setResult(prev => prev + `${JSON.stringify(data.breakdown, null, 2)}\n`)
      }
      
      setResult(prev => prev + '\n✅ ALL DIAGNOSTICS PASSED!\n')
      setResult(prev => prev + '\nYour livestream should work correctly.\n')
      setResult(prev => prev + 'If you still have issues, check:\n')
      setResult(prev => prev + '- Camera/microphone permissions in browser\n')
      setResult(prev => prev + '- Agora project is in "Testing" mode (App ID + Token)\n')
      setResult(prev => prev + '- No VPN/firewall blocking Agora servers\n')
      
    } catch (err: any) {
      setResult(prev => prev + `\n❌ Diagnostic failed: ${err.message}\n`)
      setResult(prev => prev + `Stack: ${err.stack}\n`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result)
    alert('Diagnostic results copied to clipboard!')
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Livestream Token Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runFullDiagnostic} disabled={loading}>
            {loading ? 'Running...' : 'Run Full Diagnostic'}
          </Button>
          {result && (
            <Button onClick={copyToClipboard} variant="outline">
              Copy Results
            </Button>
          )}
        </div>
        
        {result && (
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {result}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold mb-2">This diagnostic will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Check if you're properly authenticated</li>
            <li>Test edge function connectivity</li>
            <li>Attempt to generate a test token</li>
            <li>Validate the token format</li>
            <li>Show detailed error information if anything fails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
