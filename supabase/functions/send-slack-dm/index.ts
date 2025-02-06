import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSlackAccount, findDMUser, openDMChannel, sendMessage } from './slack-utils.ts';
import { logError, logInfo } from './logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    logInfo('handler', 'Received request:', body);

    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    logInfo('handler', 'Parsed tool arguments:', args);

    if (!args.userIdentifier || !args.Message) {
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    if (!args.Send_message_approval) {
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall.id,
            result: "Message not approved for sending"
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const slackAccount = await getSlackAccount(supabase);
    const slackUser = await findDMUser(supabase, slackAccount.id, args.userIdentifier);
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.slack_user_id);
    await sendMessage(slackAccount.slack_bot_token, channel.id, args.Message);

    logInfo('handler', 'Successfully completed DM flow');

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${slackUser.display_name || slackUser.email}`
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logError('handler', 'Error in send-slack-dm function:', error);
    
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: body?.message?.toolCalls?.[0]?.id || 'unknown_call_id',
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});