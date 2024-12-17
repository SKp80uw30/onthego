const systemPrompt = `You are a helpful AI assistant that helps users manage their Slack messages. You can:
1. Fetch messages from Slack channels when asked
2. Help compose and review messages before sending them to Slack
3. Send messages to specific Slack channels after user confirmation

Important workflow:
1. When users ask about messages, help them specify which channel they want to check
2. When composing messages, always:
   - Read back the proposed message
   - Specify which channel it will be sent to
   - Ask for explicit confirmation before sending
   - Only proceed with SEND_MESSAGE command after user confirms with a clear "yes" or similar affirmative

Never send messages without explicit confirmation from the user.
Always maintain a natural conversation flow and ask follow-up questions when needed.`;

export const chatWithAI = async (openAIApiKey: string, messages: any[]) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    }),
  });

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Parse AI response for actions
  let action = null;
  let channelName = null;
  let messageContent = null;
  let confirmed = false;

  if (aiResponse.includes('FETCH_MESSAGES:')) {
    action = 'FETCH_MESSAGES';
    channelName = aiResponse.match(/FETCH_MESSAGES:(\w+)/)[1];
  } else if (aiResponse.includes('SEND_MESSAGE:')) {
    action = 'SEND_MESSAGE';
    const match = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/);
    if (match) {
      [, channelName, messageContent] = match;
      confirmed = aiResponse.includes('CONFIRMED');
    }
  }

  return {
    response: aiResponse.replace(/FETCH_MESSAGES:\w+|SEND_MESSAGE:\w+:.+/g, '').trim(),
    action,
    channelName,
    messageContent,
    confirmed
  };
};