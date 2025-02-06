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

    const channelName = 'general' // You might want to make this configurable

    // First, try to join the channel
    console.log('Attempting to join channel:', channelName)
    const joinResponse = await fetch('https://slack.com/api/conversations.join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelName,
      }),
    })

    const joinResult = await joinResponse.json()
    console.log('Join channel response:', joinResult)

    // Get channel ID (whether we just joined or were already in it)
    console.log('Getting channel ID for:', channelName)
    const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
    })

    const channelList = await channelListResponse.json()
    console.log('Channel list response:', channelList)

    if (!channelList.ok) {
      throw new Error(`Slack API error: ${channelList.error}`)
    }

    const channel = channelList.channels.find((c: any) => c.name === channelName)
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`)
    }

    // Send message to Slack
    console.log('Sending message to channel:', channel.id)
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channel.id,
        text: message,
      }),
    })

    const slackResponse = await response.json()
    console.log('Slack post message response:', slackResponse)
    
    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.error}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-slack-message function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})