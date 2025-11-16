import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type UserRole = 'user' | 'scholar' | 'imam' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
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
