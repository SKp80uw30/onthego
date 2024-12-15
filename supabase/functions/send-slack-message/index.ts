import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const { message } = await req.json()
    
    // Get the user's ID from the request
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Get the user's Slack account
    const { data: slackAccount, error: slackError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (slackError || !slackAccount) {
      throw new Error('No Slack account found')
    }

    // Send message to Slack
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'general', // You might want to make this configurable
        text: message,
      }),
    })

    const slackResponse = await response.json()
    
    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.error}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})