import { SlackCommand, AIResponse } from './types.ts';

const commandSystemPrompt = `You are a command parser that converts natural language requests into structured Slack commands. Your role is to:

1. Parse user requests for Slack operations into specific commands
2. Extract key parameters like channel names, message counts, and time periods
3. Return structured commands without any conversation or clarification

Command Types:
1. FETCH_MESSAGES: Get messages from a channel
2. FETCH_MENTIONS: Get messages where user was mentioned
3. SEND_MESSAGE: Send a new message to a channel

Guidelines for parameters:
1. Channel names: Extract from request or use 'ALL' for cross-channel
2. Message counts:
   - "last/recent message" = 1
   - "couple/few messages" = 3
   - Specific numbers = exact count
   - Default = 3
3. Time periods:
   - "today" = current day
   - "last X hours/minutes" = specific period
   - Default = recent (last 24 hours)

Return ONLY the structured command without any conversation.
Examples:
- "Show mentions in general" -> "FETCH_MENTIONS:general:2024-03-14T00:00:00Z"
- "Get my last 5 messages" -> "FETCH_MESSAGES:general:5"
- "Send hello to team" -> "SEND_MESSAGE:team:hello"`;

export async function parseCommand(message: string, openAIApiKey: string): Promise<SlackCommand | null> {
  try {
    console.log('Parsing command:', message);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: commandSystemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3, // Lower temperature for more consistent command parsing
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error in command parsing:', error);
      return null;
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse the command string
    let command: SlackCommand | null = null;
    
    if (aiResponse.includes('FETCH_MENTIONS:')) {
      const [, channelName, timestamp] = aiResponse.match(/FETCH_MENTIONS:(\w+|ALL):(.+)/) || [];
      command = {
        action: 'FETCH_MENTIONS',
        channelName,
        timestamp
      };
    } else if (aiResponse.includes('FETCH_MESSAGES:')) {
      const [, channelName, count] = aiResponse.match(/FETCH_MESSAGES:(\w+):(\d+)/) || [];
      command = {
        action: 'FETCH_MESSAGES',
        channelName,
        messageCount: parseInt(count, 10)
      };
    } else if (aiResponse.includes('SEND_MESSAGE:')) {
      const [, channelName, content] = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/) || [];
      command = {
        action: 'SEND_MESSAGE',
        channelName,
        messageContent: content
      };
    }

    console.log('Parsed command:', command);
    return command;
  } catch (error) {
    console.error('Error in command parsing:', error);
    return null;
  }
}