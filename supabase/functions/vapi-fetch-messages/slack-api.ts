export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
};

export async function getSlackChannel(botToken: string, channelName: string) {
  console.log('Fetching channel list from Slack...');
  const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const channelList = await channelListResponse.json();
  if (!channelList.ok) {
    console.error('Slack API error:', channelList.error);
    throw new Error(`Slack API error: ${channelList.error}`);
  }

  const channel = channelList.channels.find((c: any) => 
    c.name.toLowerCase() === channelName.toLowerCase()
  );
  
  if (!channel) {
    console.error('Channel not found:', channelName);
    throw new Error(`Channel ${channelName} not found`);
  }

  console.log('Found channel:', { 
    channelId: channel.id, 
    channelName: channel.name,
    isMember: channel.is_member 
  });

  return channel;
}

export async function fetchSlackMessages(botToken: string, channelId: string, count: number) {
  console.log('Fetching messages:', {
    channelId,
    count
  });

  const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${count}`, {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const messagesData = await messagesResponse.json();
  if (!messagesData.ok) {
    console.error('Failed to fetch messages:', messagesData.error);
    throw new Error(`Failed to fetch messages: ${messagesData.error}`);
  }

  return messagesData.messages;
}