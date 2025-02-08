
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from '../../_shared/logging.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import { findDMUser, openDMChannel, sendMessage, verifyToken } from '../common/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    console.log('Received request:', reqBody);

    const toolCall = reqBody.message?.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('Invalid request structure:', reqBody);
      throw new Error('Invalid request structure');
    }

    const args = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Parsed tool arguments:', args);

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the user in our DM users table
    const user = await findDMUser(supabase, slackAccountId, args.userIdentifier);

    // Get the Slack account with the user token
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount) {
      logError('sendDM', 'No Slack account found', { error: accountError });
      throw new Error('No Slack account found');
    }

    // We specifically need the user token for DMs
    if (!slackAccount.slack_user_token) {
      logError('sendDM', 'No user token found', { accountId: slackAccountId });
      throw new Error('No user token found. Please reconnect your Slack account.');
    }

    // Verify the token has the correct permissions
    await verifyToken(slackAccount.slack_user_token);
    
    // Open DM channel
    const channel = await openDMChannel(slackAccount.slack_user_token, user.slack_user_id);
    
    // Send the message using the user token
    await sendMessage(slackAccount.slack_user_token, channel.id, args.Message);

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

