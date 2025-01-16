import { FunctionDefinition } from './types';

export const slackFunctions: FunctionDefinition[] = [
  {
    name: "send_message",
    description: "Send a message to a Slack channel",
    parameters: {
      type: "object",
      properties: {
        Channel_name: {
          type: "string",
          description: "The name of the Slack channel to send the message to"
        },
        Channel_message: {
          type: "string",
          description: "The message content to send"
        },
        Send_message_approval: {
          type: "boolean",
          description: "Confirmation that the message should be sent"
        }
      },
      required: ["Channel_name", "Channel_message", "Send_message_approval"]
    }
  },
  {
    name: "send_direct_message",
    description: "Send a direct message to a Slack user",
    parameters: {
      type: "object",
      properties: {
        Username: {
          type: "string",
          description: "The display name or email of the Slack user to send the message to. Must be an active user in your workspace."
        },
        Message: {
          type: "string",
          description: "The message content to send"
        },
        Send_message_approval: {
          type: "boolean",
          description: "Confirmation that the message should be sent"
        }
      },
      required: ["Username", "Message", "Send_message_approval"]
    }
  },
  {
    name: "fetch_messages",
    description: "Fetch recent messages from a Slack channel",
    parameters: {
      type: "object",
      properties: {
        Channel_name: {
          type: "string",
          description: "The name of the Slack channel to fetch messages from"
        },
        Number_fetch_messages: {
          type: "number",
          description: "Number of messages to fetch (default: 5)"
        }
      },
      required: ["Channel_name"]
    }
  }
];