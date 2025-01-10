import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const clientId = Deno.env.get('SLACK_CLIENT_ID')
const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!)
    const { code, isReconnect } = await req.json()

    console.log('Processing OAuth request:', { isReconnect })

    // Exchange the code for an access token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
      }),
    })

    const data = await response.json()
    console.log('Slack OAuth response:', data)

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error || 'Unknown error'}`)
    }

    // Get the user's ID from the auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    console.log('Auth header:', authHeader)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)
    
    if (userError) {
      console.error('User error:', userError)
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('No authenticated user found')
    }

    console.log('User found:', user.id)

    // Check if workspace already exists for this user
    const { data: existingWorkspace, error: checkError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('slack_workspace_id', data.team.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check workspace error:', checkError)
      throw new Error(`Database check error: ${checkError.message}`)
    }

    if (existingWorkspace) {
      // Update existing workspace
      const { error: updateError } = await supabase
        .from('slack_accounts')
        .update({
          slack_workspace_name: data.team.name,
          slack_bot_token: data.access_token,
          needs_reauth: false, // Reset the reauth flag
        })
        .eq('id', existingWorkspace.id)

      if (updateError) {
        console.error('Update workspace error:', updateError)
        throw new Error(`Failed to update workspace: ${updateError.message}`)
      }
    } else {
      // Insert new workspace
      const { error: insertError } = await supabase
        .from('slack_accounts')
        .insert({
          user_id: user.id,
          slack_workspace_id: data.team.id,
          slack_workspace_name: data.team.name,
          slack_bot_token: data.access_token,
          needs_reauth: false,
        })

      if (insertError) {
        console.error('Insert workspace error:', insertError)
        throw new Error(`Failed to store workspace: ${insertError.message}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in slack-oauth function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})