import { logError, logInfo } from '../../_shared/logging.ts';
import { sendDMMessage } from '../../slack/dms/send-message.ts';
import { fetchDMMessages } from '../../slack/dms/fetch-messages.ts';
import { createSupabaseClient } from '../../_shared/supabase.ts';

export async function handleDMTools(toolName: string, args: Record<string, any>) {
  try {
    const supabase = createSupabaseClient();

    switch (toolName) {
      case 'send_direct_message': {
        if (!args.Send_message_approval) {
          return "Message not approved for sending";
        }

        // Find the user ID from the identifier
        const { data: dmUsers, error } = await supabase
          .from('slack_dm_users')
          .select('*')
          .eq('is_active', true);

        if (error) {
          throw new Error(`Failed to query DM users: ${error.message}`);
        }

        const user = dmUsers.find(u => 
          (u.display_name && u.display_name.toLowerCase() === args.userIdentifier.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === args.userIdentifier.toLowerCase())
        );

        if (!user) {
          throw new Error(`No matching user found for "${args.userIdentifier}"`);
        }

        await sendDMMessage(user.slack_user_id, args.Message);
        return `Message sent successfully to ${args.userIdentifier}`;
      }

      case 'Fetch_slack_dms': {
        // Similar user lookup as above
        const { data: dmUsers, error } = await supabase
          .from('slack_dm_users')
          .select('*')
          .eq('is_active', true);

        if (error) {
          throw new Error(`Failed to query DM users: ${error.message}`);
        }

        const user = dmUsers.find(u => 
          (u.display_name && u.display_name.toLowerCase() === args.userIdentifier.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === args.userIdentifier.toLowerCase())
        );

        if (!user) {
          throw new Error(`No matching user found for "${args.userIdentifier}"`);
        }

        const messages = await fetchDMMessages(
          user.slack_user_id,
          args.messageCount || 5
        );
        return JSON.stringify({ Messages: messages });
      }

      default:
        throw new Error(`Unknown DM tool: ${toolName}`);
    }
  } catch (error) {
    logError('handleDMTools', error);
    throw error;
  }
}