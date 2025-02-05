import { SlackResponse, SlackChannel } from './types.ts';
import { logError, logInfo } from '../../_shared/logging.ts';

export async function callSlackApi(
  endpoint: string,
  token: string,
  method = 'GET',
  body?: Record<string, any>
): Promise<SlackResponse> {
  try {
    const response = await fetch(`https://slack.com/api/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();
    
    if (!result.ok) {
      logError('callSlackApi', {
        endpoint,
        error: result.error,
        details: result
      });
      throw new Error(`Slack API error: ${result.error}`);
    }

    logInfo('callSlackApi', {
      endpoint,
      success: true
    });

    return result;
  } catch (error) {
    logError('callSlackApi', error);
    throw error;
  }
}

export async function getSlackChannel(token: string, channelName: string): Promise<SlackChannel> {
  const result = await callSlackApi('conversations.list', token);
  
  if (!result.ok) {
    throw new Error('Failed to fetch channels');
  }

  const channel = result.channels.find((c: any) => 
    c.name.toLowerCase() === channelName.toLowerCase()
  );
  
  if (!channel) {
    throw new Error(`Channel ${channelName} not found`);
  }

  return channel;
}