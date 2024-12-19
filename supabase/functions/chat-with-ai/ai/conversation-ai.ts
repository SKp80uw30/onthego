import { AIResponse, ConversationMessage } from './types.ts';

const conversationSystemPrompt = `You are a helpful AI assistant that helps users manage their Slack workspace through natural conversation. Your role is to:

1. Maintain engaging, helpful dialogue with users
2. Explain what actions are being taken
3. Provide clear feedback about results
4. Ask for clarification when needed
5. Help users understand how to better interact with Slack

Guidelines:
1. Be concise but friendly
2. Explain actions in simple terms
3. When errors occur, suggest alternatives
4. Keep context of the conversation
5. Don't ask for confirmation for fetch operations

IMPORTANT:
- When an action has been completed (like fetching messages or mentions), acknowledge it and ask if there's anything else you can help with
- Don't repeat actions that have already been completed
- Don't ask for permission to do something that's already been done
- Always end your response with "Is there anything else I can help you with?" after completing a task

Remember:
- Keep responses natural and conversational
- Acknowledge when operations are successful
- Provide helpful suggestions when relevant
- Stay focused on Slack-related tasks`;

export async function getConversationalResponse(
  message: string,
  openAIApiKey: string,
  conversationHistory: ConversationMessage[],
  commandResult?: any
): Promise<AIResponse> {
  try {
    console.log('Getting conversational response:', {
      message,
      hasCommandResult: !!commandResult,
      historyLength: conversationHistory.length
    });

    // Add context about command results if available
    const contextMessage = commandResult 
      ? `\n\nContext: Action has been completed. ${JSON.stringify(commandResult)}`
      : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: conversationSystemPrompt + contextMessage },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error in conversation:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Conversation response:', aiResponse);

    return {
      response: aiResponse,
      // We don't parse commands here as that's handled by the CommandAI
    };
  } catch (error) {
    console.error('Error in conversation:', error);
    throw error;
  }
}