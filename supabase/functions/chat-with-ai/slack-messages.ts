import { callSlackAPI } from './slack-api.ts';

export async function fetchSlackMessages(channelName: string, botToken: string) {
  console.log('Starting fetchSlackMessages:', { channelName });
  
  try {
    // Get channel ID
    console.log('Fetching channel list from Slack...');
    const channelListResponse = await callSlackAPI(
      'https://slack.com/api/conversations.list',
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );
    
    const channelsData = await channelListResponse.json();
    console.log('Channels response:', {
      ok: channelsData.ok,
      channelCount: channelsData.channels?.length,
      channelNames: channelsData.channels?.map((c: any) => c.name)
    });

    if (!channelsData.ok) {
      throw new Error(`Failed to fetch channels: ${channelsData.error}`);
    }

    const channel = channelsData.channels?.find((c: any) => c.name === channelName);
    
    if (!channel) {
      console.error(`Channel ${channelName} not found in workspace`);
      throw new Error(`Channel ${channelName} not found`);
    }

    console.log('Found channel:', { 
      channelId: channel.id, 
      channelName: channel.name,
      isMember: channel.is_member,
      isPrivate: channel.is_private 
    });

    // Fetch messages
    console.log('Fetching messages for channel:', channel.id);
    const messagesResponse = await callSlackAPI(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );

    const messagesData = await messagesResponse.json();
    console.log('Messages response:', {
      ok: messagesData.ok,
      messageCount: messagesData.messages?.length,
      hasMore: messagesData.has_more
    });

    if (!messagesData.ok) {
      throw new Error(`Failed to fetch messages: ${messagesData.error}`);
    }

    return messagesData.messages?.map((msg: any) => msg.text) || [];
  } catch (error) {
    console.error('Detailed error in fetchSlackMessages:', {
      error: error.message,
      channelName,
      stack: error.stack
    });
    throw error;
  }
}

export async function sendSlackMessage(channelName: string, message: string, botToken: string) {
  console.log('Starting sendSlackMessage:', { 
    channelName,
    messageLength: message.length 
  });
  
  try {
    // First get channel ID
    const channelListResponse = await callSlackAPI(
      'https://slack.com/api/conversations.list',
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );
    
    const channelsData = await channelListResponse.json();
    
    if (!channelsData.ok) {
      throw new Error(`Failed to fetch channels: ${channelsData.error}`);
    }

    const channel = channelsData.channels?.find((c: any) => c.name === channelName);
    
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Send message
    const messageResponse = await callSlackAPI(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.id,
          text: message,
        }),
      }
    );

    const result = await messageResponse.json();
    console.log('Message sent result:', {
      ok: result.ok,
      ts: result.ts,
      channel: result.channel
    });

    if (!result.ok) {
      throw new Error(`Failed to send message: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending Slack message:', {
      error: error.message,
      channelName,
      stack: error.stack
    });
    throw error;
  }
}