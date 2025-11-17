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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist, try to create it instead of signing out
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
            } else {
              console.log('Profile created successfully, refetching...')
              // Try fetching again
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
              
              if (newProfile) {
                console.log('New profile fetched successfully')
                setProfile(newProfile)
              }
            }
          }
          setLoading(false)
          return
        }
      }
      
      if (data) {
        console.log('Profile fetched successfully:', data.email)
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('SignIn: Starting authentication for', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      console.error('SignIn: Authentication failed', error)
      // Provide user-friendly error messages
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email address. Check your inbox for the confirmation link.')
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.')
      } else {
        throw new Error(error.message)
      }
    }

    console.log('SignIn: Authentication successful, checking profile...')

    // Verify profile exists for this user
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        console.log('SignIn: Profile not found, creating...')
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: (data.user.user_metadata?.role as UserRole) || 'user',
        })

        if (insertError) {
          console.error('SignIn: Failed to create profile:', insertError)
          throw new Error('Account setup incomplete. Please contact support.')
        }
        console.log('SignIn: Profile created successfully')
      } else {
        console.log('SignIn: Profile exists')
      }
    }
    console.log('SignIn: Complete')
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
