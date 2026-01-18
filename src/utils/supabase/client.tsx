import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

// Supabase configuration - these are public values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtmmeumzjcldqukpqcfi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bW1ldW16amNsZHF1a3BxY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjU3NTUsImV4cCI6MjA3ODkwMTc1NX0.Bp-7JF66UIVuzKtVmilxovkEwe-TSXHMT_eqETHVPLo'

// Check if we're on native platform
const isNative = Capacitor.isNativePlatform()

// In-memory cache for faster sync access
const memoryCache: Record<string, string> = {}

// Improved storage adapter that syncs to both memory and persistent storage
const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // First check memory cache (fastest)
    if (memoryCache[key]) {
      return memoryCache[key]
    }
    
    try {
      if (isNative) {
        const { value } = await Preferences.get({ key })
        if (value) {
          memoryCache[key] = value // Cache it
          // Also sync to localStorage as backup
          try { window.localStorage.setItem(key, value) } catch {}
        }
        return value
      }
    } catch (e) {
      console.warn('Capacitor storage read error:', e)
    }
    
    // Fallback to localStorage
    const localValue = window.localStorage.getItem(key)
    if (localValue) {
      memoryCache[key] = localValue
    }
    return localValue
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    // Always update memory cache first
    memoryCache[key] = value
    
    // Always save to localStorage (sync, reliable)
    try {
      window.localStorage.setItem(key, value)
    } catch (e) {
      console.warn('localStorage write error:', e)
    }
    
    // Also save to native Preferences if available
    if (isNative) {
      try {
        await Preferences.set({ key, value })
      } catch (e) {
        console.warn('Capacitor storage write error:', e)
      }
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    // Remove from memory cache
    delete memoryCache[key]
    
    // Remove from localStorage
    try {
      window.localStorage.removeItem(key)
    } catch (e) {
      console.warn('localStorage remove error:', e)
    }
    
    // Remove from native Preferences
    if (isNative) {
      try {
        await Preferences.remove({ key })
      } catch (e) {
        console.warn('Capacitor storage remove error:', e)
      }
    }
  },
}

// Pre-load auth from storage into memory on startup
const preloadAuth = async () => {
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key: 'masjid-auth' })
      if (value) {
        memoryCache['masjid-auth'] = value
        try { window.localStorage.setItem('masjid-auth', value) } catch {}
        console.log('✅ Auth preloaded from Capacitor Preferences')
      }
    }
  } catch (e) {
    console.warn('Auth preload error:', e)
  }
}

// Start preloading immediately
preloadAuth()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // CRITICAL: Keep session
    autoRefreshToken: true, // CRITICAL: Auto-refresh before expiry
    detectSessionInUrl: true,
    storageKey: 'masjid-auth', // Custom key for our app
    storage: capacitorStorage as any, // Use Capacitor Preferences on mobile, localStorage on web
    flowType: 'pkce', // Secure authentication flow
    debug: false, // Disable debug in production
  },
  global: {
    headers: {
      'X-Client-Info': 'masjid-app'
    }
  },
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
