import { AIResponse, ConversationMessage } from './types.ts';

const conversationSystemPrompt = `You are a helpful AI assistant that helps users manage their Slack workspace through natural conversation. Your role is to:

1. Help users compose messages for Slack:
   - Generate professional responses based on user requirements
   - Show the complete message and target channel before sending
   - Wait for "Pineapple confirmation" before sending
   - Stop current explanation if user sends "Pineapple confirmation"

2. When generating messages:
   - Always specify both the channel and the complete message
   - Format: "I'll send this message to #[channel]: '[message]'"
   - Ask if they want to modify before sending
   - Wait for "Pineapple confirmation"

3. Maintain engaging, helpful dialogue:
   - Acknowledge when operations are successful
   - Provide clear feedback about results
   - Ask for clarification when needed

IMPORTANT:
- When an action has been completed, acknowledge it and ask if there's anything else you can help with
- Don't repeat actions that have already been completed
- Don't ask for permission to do something that's already been done
- Always end your response with "Is there anything else I can help you with?" after completing a task
- Stop current explanation immediately if user says "Pineapple confirmation"`;

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

    // If this is a message generation request, we need to create a structured response
    if (message.toLowerCase().includes('please') && 
        (message.toLowerCase().includes('write') || 
         message.toLowerCase().includes('respond') || 
         message.toLowerCase().includes('reply') || 
         message.toLowerCase().includes('generate'))) {
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are an AI that generates Slack messages. Generate a message based on the user\'s request and return it in JSON format with "channelName" and "messageContent" fields.' 
            },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate message');
      }

      const data = await response.json();
      const generatedContent = JSON.parse(data.choices[0].message.content);

      return {
        response: `I'll send this message to #${generatedContent.channelName}: "${generatedContent.messageContent}"\n\nWould you like to modify this message before sending? If you're happy with it, just say "Pineapple confirmation".`,
        action: 'GENERATE_MESSAGE',
        channelName: generatedContent.channelName,
        messageContent: generatedContent.messageContent,
        pendingMessage: {
          content: generatedContent.messageContent,
          channelName: generatedContent.channelName,
          status: 'pending_confirmation'
        }
      };
    }

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
      ...(commandResult || {}),
    };
  } catch (error) {
    console.error('Error in conversation:', error);
    throw error;
  }
}