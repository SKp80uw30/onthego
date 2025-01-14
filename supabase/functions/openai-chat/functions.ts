import { FunctionDefinition } from './types.ts';

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
  },
  {
    name: 'send_dm',
    description: 'Send a direct message to a Slack user',
    parameters: {
      type: 'object',
      properties: {
        Username: {
          type: 'string',
          description: 'The username, email, or display name of the Slack user to send the message to'
        },
        Message: {
          type: 'string',
          description: 'The message content to send'
        },
        Send_message_approval: {
          type: 'boolean',
          description: 'Confirmation that the message should be sent'
        }
      },
      required: ['Username', 'Message', 'Send_message_approval']
    }
  },
  {
    name: 'fetch_dms',
    description: 'Fetch direct messages with a specific Slack user',
    parameters: {
      type: 'object',
      properties: {
        Username: {
          type: 'string',
          description: 'The username or display name of the Slack user'
        },
        Number_fetch_messages: {
          type: 'number',
          description: 'Number of messages to fetch (default: 5)'
        },
        Unread_only: {
          type: 'boolean',
          description: 'Whether to fetch only unread messages'
        }
      },
      required: ['Username']
    }
  }
];