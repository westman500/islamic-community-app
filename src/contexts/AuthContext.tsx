import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, type Profile, type UserRole } from '../utils/supabase/client'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

// Helper functions for cross-platform storage
const isNative = Capacitor.isNativePlatform()

const setStorageItem = async (key: string, value: string) => {
  if (isNative) {
    await Preferences.set({ key, value })
  }
  // Always also use localStorage as backup
  localStorage.setItem(key, value)
}

const getStorageItem = async (key: string): Promise<string | null> => {
  if (isNative) {
    const { value } = await Preferences.get({ key })
    if (value) return value
  }
  return localStorage.getItem(key)
}

const removeStorageItem = async (key: string) => {
  if (isNative) {
    await Preferences.remove({ key })
  }
  localStorage.removeItem(key)
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  void initialized

  useEffect(() => {
    let isMounted = true
    
    // Enhanced session initialization with comprehensive recovery
    const initializeAuth = async () => {
      console.log('🔐 AuthContext: Initializing authentication...')
      
      try {
        // STEP 1: Try to get existing session from Supabase (uses Capacitor Preferences on native)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (session) {
          console.log('✅ Active session found:', session.user.email)
          setSession(session)
          setUser(session.user)
          await setStorageItem('masjid-last-activity', new Date().toISOString())
          await fetchProfile(session.user.id)
          setLoading(false)
          setInitialized(true)
          return
        }
        
        // STEP 2: No active session - try to recover from stored auth
        console.log('🔄 No active session, attempting recovery...')
        
        // Try multiple storage keys (Supabase uses different keys in different versions)
        const possibleKeys = ['masjid-auth', 'sb-masjid-auth', 'supabase.auth.token']
        let recovered = false
        
        for (const key of possibleKeys) {
          try {
            // Try both native and localStorage
            const storedAuth = await getStorageItem(key)
            if (!storedAuth) continue
            
            const parsed = JSON.parse(storedAuth)
            const refreshToken = parsed?.refresh_token || parsed?.currentSession?.refresh_token
            
            if (refreshToken) {
              console.log(`🔑 Found refresh token in '${key}', attempting refresh...`)
              
              const { data, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
              })
              
              if (!isMounted) return
              
              if (data?.session && !refreshError) {
                console.log('✅ Session restored successfully!')
                setSession(data.session)
                setUser(data.session.user)
                await setStorageItem('masjid-last-activity', new Date().toISOString())
                await fetchProfile(data.session.user.id)
                recovered = true
                break
              } else {
                console.warn(`⚠️ Refresh failed for '${key}':`, refreshError?.message)
              }
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse stored auth from '${key}'`)
          }
        }
        
        if (!isMounted) return
        
        if (!recovered) {
          console.log('ℹ️ No session to recover - user needs to log in')
        }
        
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }
    
    initializeAuth()
    
    return () => {
      isMounted = false
    }

    // Check and enforce 30-day inactivity logout
    const checkSessionExpiry = async () => {
      const lastActivity = await getStorageItem('masjid-last-activity')
      if (lastActivity) {
        const lastActivityDate = new Date(lastActivity)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        if (lastActivityDate < thirtyDaysAgo) {
          console.log('Session expired due to 30 days inactivity, signing out...')
          supabase.auth.signOut()
          await removeStorageItem('masjid-last-activity')
          return false
        }
      }
      // Update last activity timestamp
      await setStorageItem('masjid-last-activity', new Date().toISOString())
      return true
    }
    
    // Track app visibility and refresh session if needed
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('📱 App became visible, checking session...')
        await setStorageItem('masjid-last-activity', new Date().toISOString())
        
        // Refresh session if user has been away for a while
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (session) {
            // Check if token is about to expire (within 5 minutes)
            const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
            const now = Date.now()
            const fiveMinutes = 5 * 60 * 1000
            
            if (expiresAt - now < fiveMinutes) {
              console.log('🔄 Token expiring soon, refreshing...')
              const { data, error: refreshError } = await supabase.auth.refreshSession()
              
              if (data?.session && !refreshError) {
                console.log('✅ Session refreshed on visibility change')
                setSession(data.session)
                setUser(data.session.user)
              }
            } else {
              console.log('✅ Session still valid')
            }
          } else if (!error) {
            console.log('ℹ️ No session on visibility change')
          }
        } catch (err) {
          console.warn('⚠️ Session check on visibility change failed:', err)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Track app pause/resume events (for Capacitor)
    const handleAppStateChange = async () => {
      console.log('App state changed, preserving session')
      await setStorageItem('masjid-last-activity', new Date().toISOString())
    }
    
    window.addEventListener('pause', handleAppStateChange)
    window.addEventListener('resume', handleAppStateChange)
    window.addEventListener('beforeunload', async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          await setStorageItem('supabase.last_session_user', data.session.user.id)
          await setStorageItem('masjid-last-activity', new Date().toISOString())
        }
      } catch {}
    })
    
    // Listen for auth changes with enhanced handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session ? `User: ${session.user.email}` : 'No session')
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            console.log('✅ Session active:', event)
            if (session) {
              setSession(session)
              setUser(session.user)
              await setStorageItem('masjid-last-activity', new Date().toISOString())
              
              // Check session expiry
              const isValid = await checkSessionExpiry()
              if (!isValid) {
                console.warn('⚠️ Session expired due to inactivity')
                return
              }
              
              // Fetch/update profile
              fetchProfile(session.user.id).catch(err => {
                console.error('Profile fetch failed:', err)
              })
            }
            break
            
          case 'SIGNED_OUT':
            console.log('👋 User signed out')
            setSession(null)
            setUser(null)
            setProfile(null)
            setLoading(false)
            await removeStorageItem('masjid-last-activity')
            break
            
          case 'USER_UPDATED':
            if (session) {
              console.log('📝 User updated')
              setSession(session)
              setUser(session.user)
            }
            break
            
          default:
            // Handle any other events
            if (session) {
              setSession(session)
              setUser(session.user)
            }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pause', handleAppStateChange)
      window.removeEventListener('resume', handleAppStateChange)
      window.removeEventListener('beforeunload', () => {})
    }
  }, [])

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 3
    console.log('Fetching profile for user:', userId, 'attempt:', retryCount + 1)
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, attempting to create...')
          
          // Get user data from session
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          
          if (currentUser) {
            const { error: insertError } = await supabase.from('profiles').insert({
              id: currentUser.id,
              email: currentUser.email!,
              full_name: currentUser.user_metadata?.full_name || currentUser.email!.split('@')[0],
              role: (currentUser.user_metadata?.role as UserRole) || 'user',
            })

            if (insertError) {
              console.error('Failed to create profile:', insertError)
              
              // Retry if profile creation failed
              if (retryCount < maxRetries) {
                console.log('Retrying profile creation...')
                await new Promise(resolve => setTimeout(resolve, 500))
                return fetchProfile(userId, retryCount + 1)
              }
            } else {
              console.log('Profile created successfully, refetching...')
              // Wait a bit for database to process
              await new Promise(resolve => setTimeout(resolve, 300))
              
              // Try fetching again
              const { data: newProfile, error: refetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
              
              if (newProfile) {
                console.log('New profile fetched successfully')
                setProfile(newProfile)
                setLoading(false)
                return
              } else if (refetchError && retryCount < maxRetries) {
                console.log('Retry fetching new profile...')
                await new Promise(resolve => setTimeout(resolve, 500))
                return fetchProfile(userId, retryCount + 1)
              }
            }
          }
        } else if (retryCount < maxRetries) {
          // For other errors, retry
          console.log('Retrying due to error...')
          await new Promise(resolve => setTimeout(resolve, 500))
          return fetchProfile(userId, retryCount + 1)
        }
        
        setLoading(false)
        return
      }
      
      if (data) {
        console.log('Profile fetched successfully:', data.email)
        
        // Check if full_name is missing or default value, try to fix from auth metadata
        if (!data.full_name || data.full_name === '' || data.full_name === 'User') {
          console.log('⚠️ Profile has missing/default full_name, attempting to fix...')
          
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            
            if (currentUser) {
              const metaFullName = currentUser.user_metadata?.full_name || 
                                   currentUser.user_metadata?.fullName ||
                                   currentUser.user_metadata?.name
              
              if (metaFullName && metaFullName.trim() !== '') {
                console.log('📝 Found full_name in metadata:', metaFullName)
                
                // Update the profile in database
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    full_name: metaFullName.trim(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userId)
                
                if (!updateError) {
                  console.log('✅ Profile full_name updated successfully')
                  data.full_name = metaFullName.trim()
                } else {
                  console.warn('⚠️ Failed to update full_name:', updateError)
                }
              }
            }
          } catch (err) {
            console.warn('⚠️ Error fixing full_name:', err)
          }
        }
        
        setProfile(data)
        setLoading(false)
        setInitialized(true)
      } else {
        setLoading(false)
        setInitialized(true)
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      
      // Quick retry on exception
      if (retryCount < maxRetries) {
        console.log('Retrying after exception...')
        await new Promise(resolve => setTimeout(resolve, 200))
        return fetchProfile(userId, retryCount + 1)
      }
      
      setLoading(false)
      setInitialized(true)
    }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    console.log('🔐 SignIn: Starting authentication for', email)
    
    // Check internet connectivity before attempting login
    if (!navigator.onLine) {
      console.error('❌ No internet connection')
      throw new Error('No internet connection. Please check your network and try again.')
    }

    // Test Supabase connection
    try {
      const { error: pingError } = await supabase.from('profiles').select('id').limit(1)
      if (pingError && pingError.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection.')
      }
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please check your internet connection.')
      }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      console.error('❌ SignIn: Authentication failed', error.message)
      
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.')
      } else if (error.message.includes('Email not confirmed')) {
        // User exists but email not confirmed - this shouldn't happen after running our fix
        console.log('⚠️ Email not confirmed error - user should run FIX_AUTO_CONFIRM_USERS.sql')
        throw new Error('Email not confirmed. Please contact support or try signing up again.')
      } else {
        throw new Error(error.message)
      }
    }

    if (!data.user) {
      throw new Error('Authentication failed. Please try again.')
    }
    
    console.log('✅ SignIn: Authentication successful')
    
    // CRITICAL: Update session immediately and persist activity
    setSession(data.session)
    setUser(data.user)
    await setStorageItem('masjid-last-activity', new Date().toISOString())
    
    // Ensure session is stored properly using Capacitor Preferences
    if (data.session) {
      try {
        // Force storage update to ensure persistence on both native and web
        const sessionData = JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user
        })
        await setStorageItem('masjid-auth', sessionData)
        console.log('✅ Session persisted to storage')
      } catch (storageError) {
        console.warn('⚠️ Failed to persist session:', storageError)
      }
    }
    
    // Fetch profile and WAIT for it to complete before returning
    try {
      await fetchProfile(data.user.id)
      console.log('✅ Profile loaded successfully')
    } catch (err) {
      console.error('Profile fetch failed during sign-in:', err)
      // Don't block sign-in if profile fetch fails, but log it
    }
    
    console.log('🎉 SignIn: Complete - session secured')
  }

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    console.log('🚀 SignUp: Starting for', email)
    
    // First, try to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    console.log('📝 SignUp response:', { user: data?.user?.id, session: !!data?.session, error: error?.message })

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('This email is already registered. Please sign in or use a different email.')
      } else {
        throw new Error(error.message)
      }
    }

    // User created successfully
    if (data.user) {
      console.log('✅ User created:', data.user.id)
      
      // If we got a session, user is already logged in (email confirmation disabled)
      if (data.session) {
        console.log('🎉 Got session directly from signup!')
        setSession(data.session)
        setUser(data.session.user)
        await setStorageItem('masjid-last-activity', new Date().toISOString())
        
        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000))
        await fetchProfile(data.session.user.id)
        console.log('✅ SignUp complete with session')
        return // Success - user is logged in
      }
      
      // No session from signup - immediately try to sign in
      console.log('⚠️ No session from signup, attempting immediate sign in...')
      
      // Small delay to ensure user is fully created
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('🔐 Sign in attempt:', { session: !!signInData?.session, error: signInError?.message })
      
      if (signInData?.session) {
        console.log('🎉 Sign in successful after signup!')
        setSession(signInData.session)
        setUser(signInData.session.user)
        await setStorageItem('masjid-last-activity', new Date().toISOString())
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchProfile(signInData.session.user.id)
        console.log('✅ SignUp + SignIn complete')
        return // Success - user is logged in
      }
      
      // If we still can't sign in, something is wrong
      if (signInError) {
        console.error('❌ Sign in failed after signup:', signInError.message)
        // Check if it's email confirmation issue
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('CONFIRMATION_REQUIRED')
        }
        throw new Error(signInError.message)
      }
    }
    
    throw new Error('Signup failed. Please try again.')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw error

    setProfile((prev) => (prev ? { ...prev, ...updates } : null))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
