export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function getSlackChannel(botToken: string, channelName: string) {
  console.log('Fetching channel list from Slack...');
  const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const channelList = await channelListResponse.json();
  console.log('Channel list response:', {
    ok: channelList.ok,
    error: channelList.error,
    channelCount: channelList.channels?.length
  });

  if (!channelList.ok) {
    console.error('Slack API error:', channelList.error);
    throw new Error(`Slack API error: ${channelList.error}`);
  }

  const channel = channelList.channels?.find((c: any) => 
    c.name.toLowerCase() === channelName.toLowerCase()
  );
  
  if (!channel) {
    console.error('Channel not found:', channelName);
    throw new Error(`Channel ${channelName} not found`);
  }

  // Try to join the channel if we're not already a member
  if (!channel.is_member) {
    console.log('Bot is not a member of the channel, attempting to join...');
    const joinResponse = await fetch('https://slack.com/api/conversations.join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channel.id }),
    });

    const joinResult = await joinResponse.json();
    console.log('Join channel response:', {
      ok: joinResult.ok,
      error: joinResult.error
    });

    if (!joinResult.ok) {
      throw new Error(`Failed to join channel: ${joinResult.error}`);
    }
  }

  console.log('Found channel:', { 
    channelId: channel.id, 
    channelName: channel.name,
    isMember: channel.is_member 
  });

  return channel;
}

export async function sendSlackMessage(botToken: string, channelId: string, message: string) {
  console.log('Sending message to Slack:', {
    channelId,
    messageLength: message.length
  });

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    }),
  });

  const result = await response.json();
  console.log('Slack postMessage response:', {
    ok: result.ok,
    error: result.error,
    ts: result.ts
  });

  if (!result.ok) {
    console.error('Failed to send message:', result.error);
    throw new Error(`Failed to send message: ${result.error}`);
  }

  return result;
}

export async function fetchSlackMessages(botToken: string, channelId: string, count: number) {
  console.log('Fetching messages:', {
    channelId,
    count
  });

  const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${count * 3}`, {
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