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
  }
];