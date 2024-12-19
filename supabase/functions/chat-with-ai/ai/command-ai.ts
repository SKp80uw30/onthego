import { CommandResult } from './types.ts';

const commandSystemPrompt = `You are an AI that parses user commands for Slack interactions. Your role is to:

1. Identify when users want to:
   - Generate and send messages
   - Fetch messages or mentions
   - Confirm message sending with "Pineapple confirmation"

2. For message generation:
   - Identify the target channel
   - Parse the message content or requirements
   - Set appropriate action type

3. Special commands:
   - "Pineapple confirmation" is a special command to confirm sending a pending message
   - When "Pineapple confirmation" is received, return { action: "SEND_MESSAGE", confirmed: true }

Actions you can return:
- GENERATE_MESSAGE: When user wants to create a new message
- SEND_MESSAGE: When user confirms with "Pineapple confirmation"
- FETCH_MESSAGES: When user wants to see channel messages
- FETCH_MENTIONS: When user wants to see their mentions

Always return structured data with action type and relevant parameters.`;

export async function parseCommand(message: string, openAIApiKey: string, pendingMessage?: { content: string; channelName: string }): Promise<CommandResult | null> {
  try {
    console.log('Parsing command:', { message, hasPendingMessage: !!pendingMessage });

    // Special handling for "Pineapple confirmation"
    if (message.toLowerCase().includes('pineapple confirmation')) {
      if (!pendingMessage) {
        console.log('No pending message to confirm');
        return {
          action: 'SEND_MESSAGE',
          error: 'No pending message to confirm'
        };
      }
      
      return {
        action: 'SEND_MESSAGE',
        confirmed: true,
        channelName: pendingMessage.channelName,
        messageContent: pendingMessage.content
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: commandSystemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error in command parsing:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    try {
      const parsedResult = JSON.parse(result);
      console.log('Parsed command result:', parsedResult);
      return parsedResult;
    } catch (e) {
      console.error('Failed to parse command result:', e);
      return null;
    }
  } catch (error) {
    console.error('Error in command parsing:', error);
    return null;
  }
}