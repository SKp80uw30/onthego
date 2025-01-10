import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account');
  }

  return slackAccount;
}

async function getChannelId(botToken: string, channelName: string) {
  const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const channelList = await channelListResponse.json();
  if (!channelList.ok) {
    throw new Error(`Slack API error: ${channelList.error}`);
  }

  const channel = channelList.channels.find((c: any) => 
    c.name.toLowerCase() === channelName.toLowerCase()
  );
  
  if (!channel) {
    throw new Error(`Channel ${channelName} not found`);
  }

  return channel.id;
}

export async function sendSlackMessage(channelName: string, message: string) {
  const slackAccount = await getSlackAccount();
  const channelId = await getChannelId(slackAccount.slack_bot_token, channelName);

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    })
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Failed to send message: ${result.error}`);
  }

  return "Message sent successfully to Slack";
}

export async function fetchSlackMessages(channelName: string, messageCount: number = 5) {
  const slackAccount = await getSlackAccount();
  const channelId = await getChannelId(slackAccount.slack_bot_token, channelName);

  const messagesResponse = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=${messageCount}`,
    {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    }
  );

  const messagesData = await messagesResponse.json();
  if (!messagesData.ok) {
    throw new Error(`Failed to fetch messages: ${messagesData.error}`);
  }

  return messagesData.messages.map((msg: any) => msg.text);
}