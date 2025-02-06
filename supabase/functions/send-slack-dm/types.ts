export interface VapiToolCall {
  message: {
    toolCalls: [{
      id: string;
      function: {
        name: string;
        arguments: string | {
          userIdentifier: string;
          Message: string;
          Send_message_approval: boolean;
        };
      };
    }];
  };
}

export interface SlackDMUser {
  id: string;
  slack_user_id: string;
  display_name?: string;
  email?: string;
}

export interface SlackAccount {
  id: string;
  slack_bot_token: string;
  slack_workspace_name?: string;
}

export interface SlackChannel {
  id: string;
}