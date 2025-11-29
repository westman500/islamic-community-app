import React, { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AgoraService } from '../utils/agora'

export const AgoraTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to test')
  const [isConnected, setIsConnected] = useState(false)
  const agoraService = useRef<AgoraService | null>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)

  const testConnection = async () => {
    try {
      setStatus('🔧 Running system diagnostics...')
      
      // Test 1: Run comprehensive diagnostics first
      agoraService.current = new AgoraService()
      const diagnostics = await agoraService.current.runDiagnostics()
      
      let diagnosticsReport = '📊 System Diagnostics:\\n'
      diagnostics.diagnosticResults.forEach(result => {
        diagnosticsReport += `${result}\\n`
      })
      
      setStatus(diagnosticsReport)
      
      // Check if critical requirements are met
      if (!diagnostics.httpsConnection) {
        throw new Error('HTTPS connection required for camera/microphone access')
      }
      
      if (!diagnostics.browserSupport) {
        throw new Error('Browser does not support media devices')
      }
      
      // Test 2: Check App ID
      const appId = import.meta.env.VITE_AGORA_APP_ID as string
      if (!appId) {
        throw new Error('Missing VITE_AGORA_APP_ID environment variable')
      }
      setStatus(`${diagnosticsReport}\\n🔑 App ID: ${appId} (${appId.length} chars)`)
      
      if (appId.length !== 32) {
        throw new Error(`Invalid App ID length: ${appId.length}`)
      }
      
      // Test 3: Join test channel
      setStatus(`${diagnosticsReport}\\n🌐 Joining test channel...`)
      const testChannel = `test_${Date.now()}`
      await agoraService.current.joinChannel({
        appId,
        channel: testChannel,
        token: null,
        uid: 12345
      }, 'host')
      
      setStatus(`${diagnosticsReport}\\n✅ Successfully connected to Agora!`)
      setIsConnected(true)
      
      // Test 4: Try to create local tracks (only if devices available)
      if (diagnostics.cameras || diagnostics.microphones) {
        setStatus(`${diagnosticsReport}\\n📹 Testing camera/microphone access...`)
        const tracks = await agoraService.current.createLocalTracks()
        
        if (tracks.videoTrack && localVideoRef.current) {
          tracks.videoTrack.play(localVideoRef.current)
          setStatus(`${diagnosticsReport}\\n🎥 Video preview active! Agora is working correctly.`)
        }
      } else {
        setStatus(`${diagnosticsReport}\\n⚠️ No camera/microphone detected, but Agora connection successful!`)
      }
      
    } catch (error: any) {
      console.error('Agora test failed:', error)
      
      // Use enhanced error messaging
      let errorMessage = error.message
      if (error.message.includes('token') || error.message.includes('Token')) {
        errorMessage = AgoraService.getTokenErrorMessage(error)
      }
      
      setStatus(`❌ Test failed:\\n${errorMessage}\\n\\n💡 Solutions:\\n• Check internet connection\\n• Ensure you're signed in\\n• Try refreshing the page\\n• Check browser permissions for camera/microphone`)
    }
  }

  const disconnect = async () => {
    try {
      if (agoraService.current) {
        await agoraService.current.leave()
        setStatus('🔌 Disconnected')
        setIsConnected(false)
      }
    } catch (error: any) {
      console.error('Disconnect error:', error)
      setStatus(`❌ Disconnect failed: ${error.message}`)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Agora Configuration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-mono text-sm">{status}</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={isConnected}
            className="flex-1"
          >
            Test Agora Connection
          </Button>
          <Button 
            onClick={disconnect} 
            disabled={!isConnected}
            variant="outline"
            className="flex-1"
          >
            Disconnect
          </Button>
        </div>
        
        {/* Video preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <div 
            ref={localVideoRef} 
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white text-center">
                Click "Test Agora Connection" to start video preview
              </p>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Current Environment:</strong></p>
          <p>• URL: {window.location.href}</p>
          <p>• Secure Context: {window.isSecureContext ? '✅' : '❌'}</p>
          <p>• Platform: {navigator.platform}</p>
          <p>• User Agent: {navigator.userAgent.substring(0, 50)}...</p>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-semibold text-sm text-blue-800 mb-2">💡 If connection fails:</p>
          <p className="text-xs text-blue-700">
            1. Go to <a href="https://console.agora.io" target="_blank" className="underline">console.agora.io</a><br/>
            2. Find project with your App ID (VITE_AGORA_APP_ID)<br/>
            3. Set Authentication to "App ID" (Testing mode)<br/>
            4. Save and test again
          </p>
        </div>
      </CardContent>
    </Card>
  )
}