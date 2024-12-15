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
    const { code } = await req.json()

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
      throw new Error(data.error || 'Failed to authenticate with Slack')
    }

    // Get the user's ID from the auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Store the workspace connection
    const { error: insertError } = await supabase
      .from('slack_accounts')
      .insert({
        user_id: user.id,
        slack_workspace_id: data.team.id,
        slack_workspace_name: data.team.name,
        slack_bot_token: data.access_token,
      })

    if (insertError) {
      throw new Error('Failed to store workspace connection')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})