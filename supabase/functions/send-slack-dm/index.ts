
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from './logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    console.log('Received request:', reqBody);

    if (!reqBody.toolCalls?.[0]?.function?.arguments) {
      console.error('Invalid request structure:', reqBody);
      throw new Error('Invalid request structure');
    }

    const args = typeof reqBody.toolCalls[0].function.arguments === 'string'
      ? JSON.parse(reqBody.toolCalls[0].function.arguments)
      : reqBody.toolCalls[0].function.arguments;

    console.log('Parsed arguments:', args);

    const slackAccountId = args.slackAccountId;
    if (!slackAccountId) {
      console.error('No slackAccountId provided in arguments:', args);
      throw new Error('No slackAccountId provided');
    }

    if (!args.userIdentifier || !args.Message) {
      console.error('Missing required parameters:', args);
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    if (!args.Send_message_approval) {
      return new Response(
        JSON.stringify({ result: "Message not approved for sending" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching Slack account:', slackAccountId);
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount) {
      console.error('Error fetching Slack account:', { accountError, slackAccountId });
      throw new Error('No Slack account found');
    }

    const userToken = slackAccount.slack_user_token;
    if (!userToken) {
      console.error('No user token found for account:', slackAccountId);
      throw new Error('No user token found. Please reconnect your Slack account.');
    }

    // Find the user ID from the identifier
    const { data: dmUsers, error: dmError } = await supabase
      .from('slack_dm_users')
      .select('*')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (dmError) {
      console.error('Error fetching DM users:', dmError);
      throw new Error(`Failed to query DM users: ${dmError.message}`);
    }

    const userIdentifier = args.userIdentifier.toLowerCase();
    console.log('Looking for user:', userIdentifier, 'in users:', dmUsers);
    
    const user = dmUsers.find(u => 
      (u.display_name && u.display_name.toLowerCase() === userIdentifier) ||
      (u.email && u.email.toLowerCase() === userIdentifier) ||
      u.slack_user_id === userIdentifier
    );

    if (!user) {
      console.error('No matching user found:', {
        searchedIdentifier: userIdentifier,
        availableUsers: dmUsers.map(u => ({
          display_name: u.display_name,
          email: u.email,
          slack_user_id: u.slack_user_id
        }))
      });
      throw new Error(`No matching user found for "${args.userIdentifier}"`);
    }

    console.log('Found matching user:', user);

    // Open a DM channel
    const channelResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: user.slack_user_id })
    });

    const channelData = await channelResponse.json();
    if (!channelData.ok) {
      console.error('Error opening DM channel:', channelData);
      throw new Error(`Failed to open DM channel: ${channelData.error}`);
    }

    // Send message as user
    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelData.channel.id,
        text: args.Message,
        as_user: true
      })
    });

    const messageData = await messageResponse.json();
    if (!messageData.ok) {
      console.error('Error sending message:', messageData);
      throw new Error(`Failed to send message: ${messageData.error}`);
    }

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({
        result: `Message sent successfully to ${user.display_name || user.email || user.slack_user_id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-slack-dm function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
