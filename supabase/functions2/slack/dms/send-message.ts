import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from '../../_shared/logging.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import { findDMUser, openDMChannel, sendMessage, verifyToken } from '../common/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the incoming request JSON
    const reqBody = await req.json();
    logInfo('send-message', 'Raw request body received:', reqBody);

    // Normalize the payload structure
    // If the payload is nested under message.toolCalls, extract the JSON from the function.arguments
    let normalizedBody: any = {};
    if (reqBody.message?.toolCalls?.[0]?.function) {
      const toolCall = reqBody.message.toolCalls[0];
      const args = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      normalizedBody = {
        ...args,
        // Use slackAccountId from the nested args if provided; otherwise, fall back to top-level value
        slackAccountId: args.slackAccountId || reqBody.slackAccountId
      };
      logInfo('send-message', 'Normalized nested toolCalls payload:', normalizedBody);
    } else {
      // Assume a flat payload structure
      normalizedBody = reqBody;
      logInfo('send-message', 'Using flat payload structure:', normalizedBody);
    }

    // Destructure required fields (case-sensitive)
    const { userIdentifier, Message, Send_message_approval, slackAccountId } = normalizedBody;

    // Validate that required fields exist
    if (!userIdentifier || !Message || !slackAccountId) {
      logError('send-message', 'Missing required parameters', { normalizedBody });
      throw new Error('Missing required parameters: userIdentifier, Message, and slackAccountId');
    }

    // If the message is not approved for sending, exit early
    if (!Send_message_approval) {
      return new Response(
        JSON.stringify({ result: "Message not approved for sending" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the Supabase client using environment variables
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Look up the DM user in your table using slackAccountId and userIdentifier
    const user = await findDMUser(supabase, slackAccountId, userIdentifier);

    // Retrieve the Slack account by slackAccountId
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount) {
      logError('send-message', 'No Slack account found', { error: accountError });
      throw new Error('No Slack account found');
    }

    // Ensure that a user token exists (required to send DMs)
    if (!slackAccount.slack_user_token) {
      logError('send-message', 'No user token found', { accountId: slackAccountId });
      throw new Error('No user token found. Please reconnect your Slack account.');
    }

    // Verify that the token has proper permissions
    await verifyToken(slackAccount.slack_user_token);

    // Open a DM channel with the target user using the user token
    const channel = await openDMChannel(slackAccount.slack_user_token, user.slack_user_id);

    // Send the message using the user token
    await sendMessage(slackAccount.slack_user_token, channel.id, Message);

    // Respond with a success message
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
