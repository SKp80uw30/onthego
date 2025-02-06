import { parseCommand } from './ai/command-ai.ts';
import { getConversationalResponse } from './ai/conversation-ai.ts';
import { AIResponse, ConversationMessage } from './ai/types.ts';

export const chatWithAI = async (
  openAIApiKey: string,
  message: string,
  conversationHistory: ConversationMessage[]
): Promise<AIResponse> => {
  console.log('Starting AI interaction with message:', message);

  try {
    // First, try to parse the message as a command
    const command = await parseCommand(message, openAIApiKey);
    
    // Get conversational response, passing the command result if available
    const response = await getConversationalResponse(
      message,
      openAIApiKey,
      conversationHistory,
      command
    );

    // Combine the structured command with the conversational response
    return {
      ...response,
      ...(command && {
        action: command.action,
        channelName: command.channelName,
        messageContent: command.messageContent,
        messageCount: command.messageCount,
        timestamp: command.timestamp,
        confirmed: command.confirmed
      })
    };
  } catch (error) {
    console.error('Error in chatWithAI:', error);
    throw error;
  }
};