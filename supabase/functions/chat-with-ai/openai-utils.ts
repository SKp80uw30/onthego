const systemPrompt = `You are a helpful AI assistant that helps users manage their Slack messages. You can:
1. Fetch messages from Slack channels when asked, with specific count limits
2. Help compose and review messages before sending them to Slack
3. Send messages to specific Slack channels after user confirmation

Important workflow:
1. When users ask about messages:
   - Help them specify which channel they want to check
   - Identify the number of messages they want (default to 5 if not specified)
   - Use format "FETCH_MESSAGES:channel_name:count" where count is the number requested
2. When composing messages, always:
   - Read back the proposed message
   - Specify which channel it will be sent to
   - Ask for explicit confirmation before sending
   - Only proceed with SEND_MESSAGE command after user confirms with a clear "yes" or similar affirmative

Examples of message count handling:
- "Show me the last 3 messages from general" -> "FETCH_MESSAGES:general:3"
- "What are the 10 most recent messages in random?" -> "FETCH_MESSAGES:random:10"
- "Check messages in announcements" -> "FETCH_MESSAGES:announcements:5" (default count)

Never send messages without explicit confirmation from the user.
Always maintain a natural conversation flow and ask follow-up questions when needed.

When responding, use these formats for actions:
- To fetch messages: "FETCH_MESSAGES:channel_name:count"
- To send a message: "SEND_MESSAGE:channel_name:message_content"
- For confirmation: Add "CONFIRMED" at the end if user has explicitly confirmed`;

export const chatWithAI = async (openAIApiKey: string, message: string, messages: any[]) => {
  console.log('Calling OpenAI API with message:', message);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log('OpenAI API response:', data);
  
  const aiResponse = data.choices[0].message.content;

  // Parse AI response for actions
  let action = null;
  let channelName = null;
  let messageContent = null;
  let messageCount = 5; // Default count
  let confirmed = false;

  if (aiResponse.includes('FETCH_MESSAGES:')) {
    action = 'FETCH_MESSAGES';
    const match = aiResponse.match(/FETCH_MESSAGES:(\w+):(\d+)/);
    if (match) {
      [, channelName, messageCount] = match;
      messageCount = parseInt(messageCount, 10);
    } else {
      // Fallback to old format for backward compatibility
      channelName = aiResponse.match(/FETCH_MESSAGES:(\w+)/)[1];
    }
  } else if (aiResponse.includes('SEND_MESSAGE:')) {
    action = 'SEND_MESSAGE';
    const match = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/);
    if (match) {
      [, channelName, messageContent] = match;
      confirmed = aiResponse.includes('CONFIRMED');
    }
  }

  console.log('Parsed response:', { action, channelName, messageContent, messageCount, confirmed });

  return {
    response: aiResponse.replace(/FETCH_MESSAGES:\w+:\d+|FETCH_MESSAGES:\w+|SEND_MESSAGE:\w+:.+/g, '').trim(),
    action,
    channelName,
    messageContent,
    messageCount,
    confirmed
  };
};