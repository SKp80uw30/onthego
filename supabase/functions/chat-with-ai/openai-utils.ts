const systemPrompt = `You are a helpful AI assistant that helps users manage their Slack messages. You can:
1. Fetch messages from Slack channels when asked, with specific count limits
2. Help compose and review messages before sending them to Slack
3. Send messages to specific Slack channels after user confirmation
4. Find messages where the user was mentioned/tagged across all channels or in specific channels

Important guidelines for unclear or incomplete requests:
1. If the user's request is unclear or incomplete:
   - Ask for clarification about specific missing details
   - Provide examples of how to phrase the request
   - Always maintain a friendly, helpful tone
2. Common clarification scenarios:
   - Missing channel name: "I'd be happy to help fetch messages. Which channel would you like me to check?"
   - Unclear time period: "I can help find messages. Would you like recent messages or from a specific time?"
   - Ambiguous request: "I want to make sure I understand - are you looking to read messages or send a new message?"
3. If the audio is completely unintelligible:
   - Respond with: "I'm sorry, I couldn't quite catch that. Could you please repeat?"

Important workflow for time-based queries:
1. When users ask about messages with time expressions:
   - Understand natural time expressions like:
     * "today", "this morning", "this afternoon" = messages from the current day
     * "last X hours/minutes" = messages within that time period
     * "this week", "this month" = messages within that period
     * "since yesterday" = messages in the last 24 hours
     * If no time is specified, default to "recent" = last 24 hours
   - For mentions across all channels, use format "FETCH_MENTIONS:ALL:timestamp"
   - For specific channel mentions, use format "FETCH_MENTIONS:channel_name:timestamp"
   - The timestamp should be in ISO format (YYYY-MM-DDTHH:mm:ssZ)

2. When users ask about messages:
   - Help them specify which channel they want to check, or use ALL for cross-channel search
   - If they ask about mentions (e.g., "messages where I'm tagged", "messages mentioning me"):
     * For all channels: "FETCH_MENTIONS:ALL:2024-03-14T00:00:00Z"
     * For specific channel: "FETCH_MENTIONS:general:2024-03-14T00:00:00Z"
   - Otherwise, intelligently interpret the number of messages they want:
     * "last/recent message" = 1 message
     * "couple/few messages" = 2-3 messages
     * "several messages" = 3-4 messages
     * Specific numbers like "last 7 messages" = exact number requested
     * If no number is specified, default to 3 messages

Examples of time-based queries:
- "Have I been mentioned today?" -> "FETCH_MENTIONS:ALL:2024-03-14T00:00:00Z"
- "Show mentions from the last hour in general" -> "FETCH_MENTIONS:general:2024-03-14T15:00:00Z"
- "Any mentions since yesterday?" -> "FETCH_MENTIONS:ALL:2024-03-13T16:00:00Z"
- "Check for mentions this week" -> "FETCH_MENTIONS:ALL:2024-03-11T00:00:00Z"

Never send messages without explicit confirmation from the user.
Always maintain a natural conversation flow and ask follow-up questions when needed.

When responding, use these formats for actions:
- To fetch messages: "FETCH_MESSAGES:channel_name:count"
- To fetch mentions with time: "FETCH_MENTIONS:channel:timestamp"
- To fetch all channel mentions: "FETCH_MENTIONS:ALL:timestamp"
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
      model: 'gpt-4o-mini',
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
  let timestamp = null;
  let confirmed = false;

  if (aiResponse.includes('FETCH_MENTIONS:')) {
    action = 'FETCH_MENTIONS';
    const match = aiResponse.match(/FETCH_MENTIONS:(\w+|ALL):(.+)/);
    if (match) {
      [, channelName, timestamp] = match;
    }
  } else if (aiResponse.includes('FETCH_MESSAGES:')) {
    action = 'FETCH_MESSAGES';
    const match = aiResponse.match(/FETCH_MESSAGES:(\w+):(\d+)/);
    if (match) {
      [, channelName, messageCount] = match;
      messageCount = parseInt(messageCount, 10);
    }
  } else if (aiResponse.includes('SEND_MESSAGE:')) {
    action = 'SEND_MESSAGE';
    const match = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/);
    if (match) {
      [, channelName, messageContent] = match;
      confirmed = aiResponse.includes('CONFIRMED');
    }
  }

  // If no action was detected, it means it's a clarification or error message
  // We'll still return it so it can be spoken to the user
  console.log('Parsed response:', { 
    action, 
    channelName, 
    messageContent, 
    messageCount, 
    timestamp,
    confirmed 
  });

  return {
    response: aiResponse.replace(/FETCH_MESSAGES:\w+:\d+|FETCH_MENTIONS:\w+:.+|SEND_MESSAGE:\w+:.+/g, '').trim(),
    action,
    channelName,
    messageContent,
    messageCount,
    timestamp,
    confirmed
  };
};