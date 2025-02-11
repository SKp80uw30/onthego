
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
    logInfo('send-message', 'Raw request body received:', reqBody);

    // Normalize the payload structure
    let normalizedBody;
    
    if (reqBody.message?.toolCalls?.[0]?.function) {
      // Handle nested toolCalls structure
      const toolCall = reqBody.message.toolCalls[0];
      const args = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      
      normalizedBody = {
        ...args,
        slackAccountId: reqBody.slackAccountId // Preserve slackAccountId from top level if it exists
      };
      
      logInfo('send-message', 'Normalized nested toolCalls payload:', normalizedBody);
    } else {
      // Handle flat structure
      normalizedBody = reqBody;
      logInfo('send-message', 'Using flat payload structure:', normalizedBody);
    }

    // Validate required fields with exact case-sensitive names
    const { userIdentifier, Message, Send_message_approval, slackAccountId } = normalizedBody;

    if (!userIdentifier || !Message || !slackAccountId) {
      logError('send-message', 'Missing required parameters', { normalizedBody });
      throw new Error('Missing required parameters: userIdentifier, Message, and slackAccountId');
    }

    if (!Send_message_approval) {
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
    const user = await findDMUser(supabase, slackAccountId, userIdentifier);

    // Get the Slack account with the user token
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount) {
      logError('send-message', 'No Slack account found', { error: accountError });
      throw new Error('No Slack account found');
    }

    // We specifically need the user token for DMs
    if (!slackAccount.slack_user_token) {
      logError('send-message', 'No user token found', { accountId: slackAccountId });
      throw new Error('No user token found. Please reconnect your Slack account.');
    }

    // Verify the token has the correct permissions
    await verifyToken(slackAccount.slack_user_token);
    
    // Open DM channel
    const channel = await openDMChannel(slackAccount.slack_user_token, user.slack_user_id);
    
    // Send the message using the user token
    await sendMessage(slackAccount.slack_user_token, channel.id, Message);

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
