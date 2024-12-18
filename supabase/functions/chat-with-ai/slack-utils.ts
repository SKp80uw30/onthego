export const fetchSlackMessages = async (channelName: string, botToken: string) => {
  console.log('Fetching Slack messages:', { channelName });
  
  try {
    // Get channel ID
    console.log('Fetching channel list from Slack...');
    const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    });
    
    if (!channelListResponse.ok) {
      const error = await channelListResponse.text();
      console.error('Slack API error (conversations.list):', error);
      throw new Error(`Slack API error: ${error}`);
    }

    const channels = await channelListResponse.json();
    console.log('Channels response:', channels);

    if (!channels.ok) {
      console.error('Slack API error:', channels.error);
      throw new Error(`Slack API error: ${channels.error}`);
    }

    const channel = channels.channels.find((c: any) => c.name === channelName);
    
    if (!channel) {
      console.error(`Channel ${channelName} not found in workspace`);
      throw new Error(`Channel ${channelName} not found`);
    }

    console.log('Found channel:', { channelId: channel.id, channelName: channel.name });

    // Fetch messages
    console.log('Fetching messages for channel:', channel.id);
    const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`, {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      console.error('Slack API error (conversations.history):', error);
      throw new Error(`Slack API error: ${error}`);
    }

    const messages = await messagesResponse.json();
    console.log('Messages response:', messages);

    if (!messages.ok) {
      console.error('Slack API error:', messages.error);
      throw new Error(`Slack API error: ${messages.error}`);
    }

    return messages.messages.map((msg: any) => msg.text);
  } catch (error) {
    console.error('Error in fetchSlackMessages:', error);
    throw error;
  }
};

export const sendSlackMessage = async (channelId: string, messageContent: string, botToken: string) => {
  console.log('Sending message to Slack:', { channelId, messageLength: messageContent.length });
  
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: messageContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Slack API error (chat.postMessage):', error);
      throw new Error(`Slack API error: ${error}`);
    }

    const result = await response.json();
    console.log('Message send response:', result);

    if (!result.ok) {
      console.error('Slack API error:', result.error);
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Error in sendSlackMessage:', error);
    throw error;
  }
};