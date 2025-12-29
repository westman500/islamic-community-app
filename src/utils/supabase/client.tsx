import { createClient } from '@supabase/supabase-js'

// Supabase configuration - these are public values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtmmeumzjcldqukpqcfi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bW1ldW16amNsZHF1a3BxY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjU3NTUsImV4cCI6MjA3ODkwMTc1NX0.Bp-7JF66UIVuzKtVmilxovkEwe-TSXHMT_eqETHVPLo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // CRITICAL: Keep session in localStorage
    autoRefreshToken: true, // CRITICAL: Auto-refresh before expiry
    detectSessionInUrl: true,
    storageKey: 'masjid-auth', // Custom key for our app
    storage: window.localStorage, // Use localStorage (survives app closes)
    flowType: 'pkce', // Secure authentication flow
    debug: false, // Disable debug in production
  },
  global: {
    headers: {
      'X-Client-Info': 'masjid-app'
    }
  },
  // IMPORTANT: Ensures session is loaded synchronously on init
  // This prevents race conditions on app startup
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Enhanced session recovery helper
export const recoverSession = async () => {
  try {
    console.log('🔄 Attempting session recovery...')
    
    // Try to get existing session first
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
      console.log('✅ Session recovered successfully')
      return session
    }
    
    if (error) {
      console.warn('⚠️ Session recovery error:', error.message)
    }
    
    // If no session, check if we can refresh from stored token
    const storedSession = localStorage.getItem('masjid-auth')
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession)
        if (parsed.refresh_token) {
          console.log('🔁 Refreshing session from stored token...')
          const { data, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: parsed.refresh_token
          })
          
          if (data?.session && !refreshError) {
            console.log('✅ Session refreshed successfully')
            return data.session
          }
        }
      } catch (parseError) {
        console.error('❌ Failed to parse stored session:', parseError)
      }
    }
    
    console.log('ℹ️ No session to recover')
    return null
  } catch (error) {
    console.error('❌ Session recovery failed:', error)
    return null
  }
}

// Database types
export type UserRole = 'user' | 'scholar' | 'imam' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  profile_picture_url?: string
  bio?: string
  phone?: string
  phone_number?: string
  location?: string
  phone_verified?: boolean
  email_verified?: boolean
  face_verified?: boolean
  certificate_verified?: boolean
  smileid_verified?: boolean
  is_subscribed?: boolean
  subscription_expires_at?: string
  completed_consultations_count?: number
  average_rating?: number
  total_ratings?: number
  specializations?: string[]
  masjid_coin_balance?: number
  is_online?: boolean
  consultation_fee?: number
  consultation_duration?: number
  livestream_fee?: number
  live_consultation_fee?: number
  available_slots?: string[]
  bank_account_number?: string
  bank_code?: string
  bank_name?: string
  bank_account_name?: string
  created_at: string
  updated_at: string
}

export interface ScholarProfile extends Profile {
  specialization?: string
  qualifications?: string
  wallet_balance: number
  total_earnings: number
  verification_status: 'pending' | 'approved' | 'rejected'
}

// API helper functions
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'API call failed')
  }

  return response.json()
}
