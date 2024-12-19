import { callSlackAPI } from './slack-api.ts';

export async function fetchSlackMessages(channelName: string, botToken: string, limit: number = 5, fetchMentions: boolean = false) {
  console.log('Starting fetchSlackMessages:', { channelName, limit, fetchMentions });
  
  try {
    if (channelName === 'ALL' && fetchMentions) {
      // For mentions across all channels, use search.messages
      console.log('Fetching mentions across all channels...');
      const searchResponse = await callSlackAPI(
        'https://slack.com/api/search.messages',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${botToken}`,
          },
          params: {
            query: '@',
            count: limit,
            sort: 'timestamp',
            sort_dir: 'desc'
          }
        }
      );
      
      const searchData = await searchResponse.json();
      console.log('Search response:', {
        ok: searchData.ok,
        matchCount: searchData.messages?.matches?.length
      });

      if (!searchData.ok) {
        throw new Error(`Failed to search messages: ${searchData.error}`);
      }

      return searchData.messages?.matches?.map((match: any) => match.text) || [];
    }

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
      isPrivate: channel.is_private,
      requestedMessageCount: limit
    });

    // Fetch messages with specified limit
    const apiEndpoint = fetchMentions ? 
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${limit * 3}` : // Fetch more messages when looking for mentions
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${limit}`;

    console.log(`Fetching ${limit} messages for channel:`, channel.id);
    const messagesResponse = await callSlackAPI(
      apiEndpoint,
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
      requestedCount: limit,
      hasMore: messagesData.has_more
    });

    if (!messagesData.ok) {
      throw new Error(`Failed to fetch messages: ${messagesData.error}`);
    }

    if (fetchMentions) {
      // Filter messages to only include those with mentions
      const mentionedMessages = messagesData.messages?.filter((msg: any) => 
        msg.text.includes('@')
      ).slice(0, limit);
      return mentionedMessages?.map((msg: any) => msg.text) || [];
    }

    return messagesData.messages?.map((msg: any) => msg.text) || [];
  } catch (error) {
    console.error('Detailed error in fetchSlackMessages:', {
      error: error.message,
      channelName,
      requestedMessageCount: limit,
      fetchMentions,
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