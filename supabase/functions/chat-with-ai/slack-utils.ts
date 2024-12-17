export const fetchSlackMessages = async (channelName: string, botToken: string) => {
  // Get channel ID
  const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });
  
  const channels = await channelListResponse.json();
  const channel = channels.channels.find((c: any) => c.name === channelName);
  
  if (!channel) {
    throw new Error(`Channel ${channelName} not found`);
  }

  // Fetch messages
  const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`, {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const messages = await messagesResponse.json();
  return {
    channelId: channel.id,
    messages: messages.messages.map((msg: any) => `Message: ${msg.text}`).join('\n')
  };
};

export const sendSlackMessage = async (channelId: string, messageContent: string, botToken: string) => {
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

  const result = await response.json();
  if (!result.ok) {
    throw new Error('Failed to send message to Slack');
  }
  return result;
};