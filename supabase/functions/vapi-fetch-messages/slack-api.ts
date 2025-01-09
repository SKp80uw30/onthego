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
  console.log('Slack channel list response:', {
    ok: channelList.ok,
    channelCount: channelList.channels?.length,
    error: channelList.error
  });

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
    isMember: channel.is_member,
    isPrivate: channel.is_private,
    memberCount: channel.num_members
  });

  return channel;
}

export async function fetchSlackMessages(botToken: string, channelId: string, count: number) {
  console.log('Fetching messages:', {
    channelId,
    requestedCount: count
  });

  const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${count}`, {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const messagesData = await messagesResponse.json();
  console.log('Slack messages response:', {
    ok: messagesData.ok,
    messageCount: messagesData.messages?.length,
    hasMore: messagesData.has_more,
    error: messagesData.error
  });

  if (!messagesData.ok) {
    console.error('Failed to fetch messages:', messagesData.error);
    throw new Error(`Failed to fetch messages: ${messagesData.error}`);
  }

  console.log('Successfully fetched messages:', {
    actualCount: messagesData.messages.length,
    firstMessagePreview: messagesData.messages[0]?.text?.substring(0, 50),
    lastMessagePreview: messagesData.messages[messagesData.messages.length - 1]?.text?.substring(0, 50)
  });

  return messagesData.messages;
}