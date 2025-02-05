import { corsHeaders } from '../_shared/cors';

interface SlackDMResponse {
  ok: boolean;
  error?: string;
  channel?: {
    id: string;
  };
  messages?: any[];
}

export async function openDMChannel(botToken: string, userId: string): Promise<string> {
  console.log('Opening DM channel with user:', userId);
  
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId }),
  });

  const data: SlackDMResponse = await response.json();
  
  if (!data.ok) {
    console.error('Failed to open DM channel:', data.error);
    throw new Error(`Failed to open DM channel: ${data.error}`);
  }

  console.log('Successfully opened DM channel:', data.channel?.id);
  return data.channel?.id as string;
}

export async function fetchDMHistory(botToken: string, channelId: string, limit: number = 10): Promise<any[]> {
  console.log('Fetching DM history for channel:', channelId);
  
  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    }
  );

  const data: SlackDMResponse = await response.json();
  
  if (!data.ok) {
    console.error('Failed to fetch DM history:', data.error);
    throw new Error(`Failed to fetch DM history: ${data.error}`);
  }

  console.log(`Successfully fetched ${data.messages?.length} messages`);
  return data.messages || [];
}

export async function sendDMMessage(botToken: string, channelId: string, message: string): Promise<void> {
  console.log('Sending DM to channel:', channelId);
  
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    }),
  });

  const data: SlackDMResponse = await response.json();
  
  if (!data.ok) {
    console.error('Failed to send DM:', data.error);
    throw new Error(`Failed to send DM: ${data.error}`);
  }

  console.log('Successfully sent DM message');
}