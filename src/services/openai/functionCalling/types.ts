export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: FunctionCall;
}

export interface SlackMessageArgs {
  channelName: string;
  message: string;
}

export interface SlackDirectMessageArgs {
  userIdentifier: string;
  message: string;
  Send_message_approval: boolean;
}

export interface FetchMessagesArgs {
  channelName: string;
  count?: number;
}

export interface FetchMentionsArgs {
  channelName?: string;
  count?: number;
}