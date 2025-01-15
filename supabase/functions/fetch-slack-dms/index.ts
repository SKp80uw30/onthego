import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slackAccountId } = await req.json()
    console.log('Starting fetch-slack-dms for account:', slackAccountId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Slack token
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('slack_bot_token, slack_workspace_name')
      .eq('id', slackAccountId)
      .single()

    if (accountError) {
      console.error('Error fetching Slack account:', accountError)
      throw new Error(`Failed to get Slack account: ${accountError.message}`)
    }

    if (!slackAccount?.slack_bot_token) {
      console.error('No bot token found for account:', slackAccountId)
      throw new Error('No Slack bot token found')
    }

    console.log(`Fetching users for workspace: ${slackAccount.slack_workspace_name}`)

    // Fetch users from Slack API with detailed error handling
    const response = await fetch('https://slack.com/api/users.list', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      console.error('Fetch error:', error)
      throw new Error(`Slack API request failed: ${error.message}`)
    })

    if (!response.ok) {
      console.error('Slack API response not ok:', response.status, response.statusText)
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      throw new Error(`Slack API error: ${data.error}`)
    }

    console.log(`Found ${data.members.length} total Slack users`)

    // Process and store users
    const users = data.members
      .filter((member: any) => !member.is_bot && !member.deleted && !member.is_restricted)
      .map((member: any) => ({
        slack_account_id: slackAccountId,
        slack_user_id: member.id,
        display_name: member.profile.display_name || member.profile.real_name || member.name,
        email: member.profile.email,
        is_active: true,
        last_fetched: new Date().toISOString(),
      }))

    console.log(`Processing ${users.length} active human users`)

    // Update existing users
    const { error: upsertError } = await supabase
      .from('slack_dm_users')
      .upsert(users, {
        onConflict: 'slack_account_id,slack_user_id',
        returning: 'minimal'
      })

    if (upsertError) {
      console.error('Error upserting users:', upsertError)
      throw new Error(`Failed to update DM users: ${upsertError.message}`)
    }

    // Mark users not in the current fetch as inactive
    const activeUserIds = users.map(u => u.slack_user_id)
    if (activeUserIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('slack_dm_users')
        .update({ 
          is_active: false,
          last_fetched: new Date().toISOString(),
          error_log: 'User not found in latest fetch'
        })
        .eq('slack_account_id', slackAccountId)
        .not('slack_user_id', 'in', `(${activeUserIds.map(id => `'${id}'`).join(',')})`)

      if (deactivateError) {
        console.error('Error deactivating users:', deactivateError)
        throw new Error(`Failed to deactivate old DM users: ${deactivateError.message}`)
      }
    }

    console.log('Successfully processed all DM users')

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: users.length,
        workspace: slackAccount.slack_workspace_name 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in fetch-slack-dms:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})