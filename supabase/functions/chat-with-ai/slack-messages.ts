import { callSlackAPI } from './slack-api.ts';

export async function fetchSlackMessages(channelName: string, botToken: string, limit: number = 5, fetchMentions: boolean = false) {
  console.log('Starting fetchSlackMessages:', { channelName, limit, fetchMentions });
  
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

    const channel = channelsData.channels?.find((c: any) => c.name.toLowerCase() === channelName.toLowerCase());
    
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
    const messagesResponse = await callSlackAPI(
      `https://slack.com/api/conversations.history`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
        params: {
          channel: channel.id,
          limit: fetchMentions ? limit * 3 : limit
        }
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