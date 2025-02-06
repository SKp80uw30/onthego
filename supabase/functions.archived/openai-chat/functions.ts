import { FunctionDefinition } from './types.ts';

export const slackFunctions: FunctionDefinition[] = [
  {
    name: 'Send_slack_message',
    description: 'Send a message to a Slack channel',
    parameters: {
      type: 'object',
      properties: {
        Channel_name: {
          type: 'string',
          description: 'The name of the Slack channel to send the message to'
        },
        Channel_message: {
          type: 'string',
          description: 'The message content to send'
        },
        Send_message_approval: {
          type: 'boolean',
          description: 'Confirmation that the message should be sent'
        }
      },
      required: ['Channel_name', 'Channel_message', 'Send_message_approval']
    }
  },
  {
    name: 'Fetch_slack_messages',
    description: 'Fetch recent messages from a Slack channel',
    parameters: {
      type: 'object',
      properties: {
        Channel_name: {
          type: 'string',
          description: 'The name of the Slack channel to fetch messages from'
        },
        Number_fetch_messages: {
          type: 'number',
          description: 'Number of messages to fetch (default: 5)'
        }
      },
      required: ['Channel_name']
    }
  },
  {
    name: 'Send_slack_dm',
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
    name: 'Fetch_slack_dms',
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