import { FunctionDefinition } from './types';

export const slackFunctions: FunctionDefinition[] = [
  {
    name: 'send_message',
    description: 'Send a message to a Slack channel',
    parameters: {
      type: 'object',
      properties: {
        channelName: {
          type: 'string',
          description: 'The name of the Slack channel to send the message to'
        },
        message: {
          type: 'string',
          description: 'The message content to send'
        }
      },
      required: ['channelName', 'message']
    }
  },
  {
    name: 'send_direct_message',
    description: 'Send a direct message to a Slack user. You can identify the user by their email, @username, display name, or real name.',
    parameters: {
      type: 'object',
      properties: {
        userIdentifier: {
          type: 'string',
          description: 'The user identifier - can be their email address, @username (without the @), display name, or real name'
        },
        message: {
          type: 'string',
          description: 'The message content to send'
        },
        Send_message_approval: {
          type: 'boolean',
          description: 'Confirmation that the message should be sent'
        }
      },
      required: ['userIdentifier', 'message', 'Send_message_approval']
    }
  },
  {
    name: 'fetch_messages',
    description: 'Fetch recent messages from a Slack channel',
    parameters: {
      type: 'object',
      properties: {
        channelName: {
          type: 'string',
          description: 'The name of the Slack channel to fetch messages from'
        },
        count: {
          type: 'number',
          description: 'Number of messages to fetch (default: 5)'
        }
      },
      required: ['channelName']
    }
  },
  {
    name: 'fetch_mentions',
    description: 'Fetch messages where the user was mentioned',
    parameters: {
      type: 'object',
      properties: {
        channelName: {
          type: 'string',
          description: 'The name of the channel to fetch mentions from (optional, defaults to all channels)'
        },
        count: {
          type: 'number',
          description: 'Number of mentions to fetch (default: 5)'
        }
      },
      required: []
    }
  }
];