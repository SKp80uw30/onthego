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
   - Only proceed with SEND_MESSAGE command after user confirms

Never send messages without explicit confirmation from the user.`;

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
  return data.choices[0].message.content;
};