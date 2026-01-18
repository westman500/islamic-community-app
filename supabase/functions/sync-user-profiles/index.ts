// Edge function to sync user profiles from auth.users to profiles table
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role key to access auth.users
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔄 Starting user profile sync...')

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (authError) {
      console.error('❌ Error fetching auth users:', authError)
      throw authError
    }

    console.log(`📊 Found ${authUsers.users.length} users in auth.users`)

    // Get all existing profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      throw profilesError
    }

    const existingIds = new Set(existingProfiles?.map(p => p.id) || [])
    console.log(`📊 Found ${existingIds.size} existing profiles`)

    let synced = 0
    let updated = 0
    let errors = 0

    // Process each auth user
    for (const user of authUsers.users) {
      const fullName = user.user_metadata?.full_name || 
                       user.user_metadata?.fullName || 
                       user.user_metadata?.name ||
                       user.email?.split('@')[0] || 
                       'User'
      
      const role = user.user_metadata?.role || 'user'
      
      if (!existingIds.has(user.id)) {
        // Create new profile
        console.log(`➕ Creating profile for: ${user.email}`)
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: role,
            masjid_coin_balance: 0,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`❌ Error creating profile for ${user.email}:`, insertError)
          errors++
        } else {
          synced++
        }
      } else {
        // Update existing profile if full_name is missing
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (profile && (!profile.full_name || profile.full_name === '' || profile.full_name === 'User')) {
          console.log(`📝 Updating full_name for: ${user.email}`)
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              full_name: fullName,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            console.error(`❌ Error updating profile for ${user.email}:`, updateError)
            errors++
          } else {
            updated++
          }
        }
      }
    }

    console.log(`✅ Sync complete: ${synced} created, ${updated} updated, ${errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        updated,
        errors,
        total: authUsers.users.length,
        message: `Synced ${synced} new profiles, updated ${updated} existing profiles`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync user profiles', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
