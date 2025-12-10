import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, type Profile, type UserRole } from '../utils/supabase/client'

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
        // STEP 1: Try to get existing session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (session) {
          console.log('✅ Active session found:', session.user.email)
          setSession(session)
          setUser(session.user)
          localStorage.setItem('masjid-last-activity', new Date().toISOString())
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
            const storedAuth = localStorage.getItem(key)
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
                localStorage.setItem('masjid-last-activity', new Date().toISOString())
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
    const checkSessionExpiry = () => {
      const lastActivity = localStorage.getItem('masjid-last-activity')
      if (lastActivity) {
        const lastActivityDate = new Date(lastActivity)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        if (lastActivityDate < thirtyDaysAgo) {
          console.log('Session expired due to 30 days inactivity, signing out...')
          supabase.auth.signOut()
          localStorage.removeItem('masjid-last-activity')
          return false
        }
      }
      // Update last activity timestamp
      localStorage.setItem('masjid-last-activity', new Date().toISOString())
      return true
    }
    
    // Track app visibility and refresh session if needed
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('📱 App became visible, checking session...')
        localStorage.setItem('masjid-last-activity', new Date().toISOString())
        
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
    const handleAppStateChange = () => {
      console.log('App state changed, preserving session')
      localStorage.setItem('masjid-last-activity', new Date().toISOString())
    }
    
    window.addEventListener('pause', handleAppStateChange)
    window.addEventListener('resume', handleAppStateChange)
    window.addEventListener('beforeunload', async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          localStorage.setItem('supabase.last_session_user', data.session.user.id)
          localStorage.setItem('masjid-last-activity', new Date().toISOString())
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
              localStorage.setItem('masjid-last-activity', new Date().toISOString())
              
              // Check session expiry
              if (!checkSessionExpiry()) {
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
            localStorage.removeItem('masjid-last-activity')
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
            } else {
              // Only clear session if explicitly signed out
              // Don't clear on transient events like TOKEN_REFRESH failures
              if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setProfile(null)
              }
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
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      console.error('❌ SignIn: Authentication failed', error)
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email address. Check your inbox for the confirmation link.')
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.')
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
    localStorage.setItem('masjid-last-activity', new Date().toISOString())
    
    // Ensure session is stored properly
    if (data.session) {
      try {
        // Force storage update to ensure persistence
        localStorage.setItem('masjid-auth', JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user
        }))
        console.log('✅ Session persisted to localStorage')
      } catch (storageError) {
        console.warn('⚠️ Failed to persist session:', storageError)
      }
    }
    
    // Fetch profile in background
    fetchProfile(data.user.id).catch(err => {
      console.error('Profile fetch failed during sign-in:', err)
      // Don't block sign-in if profile fetch fails
    })
    
    console.log('🎉 SignIn: Complete - session secured')
  }

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('This email is already registered. Please sign in or use a different email.')
      } else {
        throw new Error(error.message)
      }
    }

    // If there's a session, user is auto-confirmed (likely in development)
    // If no session but user exists, email confirmation is required
    if (data.user && !data.session) {
      throw new Error('CONFIRMATION_REQUIRED')
    }

    // If we have a session, the profile should be created by the trigger
    // but let's verify it exists
    if (data.session && data.user) {
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check if profile was created by trigger
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // If trigger didn't create profile, create it manually
      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
        })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }
    }
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
