import { parseCommand } from './ai/command-ai.ts';
import { getConversationalResponse } from './ai/conversation-ai.ts';
import { AIResponse, ConversationMessage } from './ai/types.ts';

let pendingMessage: { content: string; channelName: string } | null = null;

export const chatWithAI = async (
  openAIApiKey: string,
  message: string,
  conversationHistory: ConversationMessage[]
): Promise<AIResponse> => {
  console.log('Starting AI interaction with message:', message);

  try {
    // First, try to parse the message as a command
    const command = await parseCommand(message, openAIApiKey, pendingMessage || undefined);
    
    if (command?.action === 'GENERATE_MESSAGE' && command.messageContent && command.channelName) {
      pendingMessage = {
        content: command.messageContent,
        channelName: command.channelName
      };
    } else if (command?.action === 'SEND_MESSAGE' && command.confirmed) {
      const messageToSend = pendingMessage;
      pendingMessage = null; // Clear the pending message
      return {
        response: `Message sent to #${messageToSend?.channelName}!\n\nIs there anything else I can help you with?`,
        action: 'SEND_MESSAGE',
        channelName: messageToSend?.channelName,
        messageContent: messageToSend?.content,
        confirmed: true
      };
    }
    
    // Get conversational response, passing the command result if available
    const response = await getConversationalResponse(
      message,
      openAIApiKey,
      conversationHistory,
      command
    );

    // If this response generated a new message, store it
    if (response.pendingMessage) {
      pendingMessage = {
        content: response.pendingMessage.content,
        channelName: response.pendingMessage.channelName
      };
    }

    return response;
  } catch (error) {
    console.error('Error in chatWithAI:', error);
    throw error;
  }
};