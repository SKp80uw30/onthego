import { delay } from "https://deno.land/std@0.168.0/async/delay.ts";

interface SlackAPIResponse {
  ok: boolean;
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function callSlackAPI(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    const response = await fetch(url, options);
    const data: SlackAPIResponse = await response.json();

    if (!data.ok) {
      console.error(`Slack API error: ${data.error}`);
      
      if (retries < MAX_RETRIES && isRetryableError(data.error)) {
        console.log(`Retrying Slack API call (attempt ${retries + 1}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY);
        return callSlackAPI(url, options, retries + 1);
      }
      
      throw new Error(`Slack API error: ${data.error}`);
    }

    return response;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retrying due to error: ${error.message} (attempt ${retries + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY);
      return callSlackAPI(url, options, retries + 1);
    }
    throw error;
  }
}

function isRetryableError(error?: string): boolean {
  const retryableErrors = [
    'rate_limited',
    'service_unavailable',
    'timeout',
    'temporary_error'
  ];
  return error ? retryableErrors.includes(error) : false;
}

export async function fetchSlackMessages(channelName: string, botToken: string) {
  console.log('Fetching Slack messages:', { channelName });
  
  try {
    // Get channel ID
    console.log('Fetching channel list from Slack...');
    const channelListResponse = await callSlackAPI(
      'https://slack.com/api/conversations.list',
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );
    
    const channels = await channelListResponse.json();
    console.log('Channels response:', channels);

    const channel = channels.channels.find((c: any) => c.name === channelName);
    
    if (!channel) {
      console.error(`Channel ${channelName} not found in workspace`);
      throw new Error(`Channel ${channelName} not found`);
    }

    console.log('Found channel:', { channelId: channel.id, channelName: channel.name });

    // Fetch messages
    console.log('Fetching messages for channel:', channel.id);
    const messagesResponse = await callSlackAPI(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );

    const messages = await messagesResponse.json();
    console.log('Messages response:', messages);

    return messages.messages.map((msg: any) => msg.text);
  } catch (error) {
    console.error('Error in fetchSlackMessages:', error);
    throw error;
  }
}

export async function sendSlackMessage(channelName: string, message: string, botToken: string) {
  console.log('Sending Slack message:', { channelName, messageLength: message.length });
  
  try {
    // First get channel ID
    const channelListResponse = await callSlackAPI(
      'https://slack.com/api/conversations.list',
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
        },
      }
    );
    
    const channels = await channelListResponse.json();
    const channel = channels.channels.find((c: any) => c.name === channelName);
    
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Send message
    const response = await callSlackAPI(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.id,
          text: message,
        }),
      }
    );

    const result = await response.json();
    console.log('Message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}