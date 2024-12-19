import { delay } from "https://deno.land/std@0.168.0/async/delay.ts";

interface SlackAPIResponse {
  ok: boolean;
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function callSlackAPI(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    console.log(`Calling Slack API: ${url}`, { retries });
    const response = await fetch(url, options);
    const data: SlackAPIResponse = await response.json();

    if (!data.ok) {
      console.error(`Slack API error response:`, data);
      
      if (retries < MAX_RETRIES && isRetryableError(data.error)) {
        console.log(`Retrying Slack API call (attempt ${retries + 1}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY);
        return callSlackAPI(url, options, retries + 1);
      }
      
      throw new Error(`Slack API error: ${data.error}`);
    }

    console.log('Slack API call successful:', { url, ok: data.ok });
    return response;
  } catch (error) {
    console.error('Slack API call failed:', { url, error: error.message, stack: error.stack });
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
  console.log('Starting fetchSlackMessages:', { channelName });
  
  try {
    // Get channel ID
    console.log('Fetching channel list from Slack...');
    const channelListResponse = await callSlackAPI(
      'https://slack.com/api/conversations.list',
      {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const channels = await channelListResponse.json();
    console.log('ChannelsLet me check the Edge Function logs to see exactly what's happening on the server side when the fetch messages request fails.

<lov-actions>
<lov-link url="https://supabase.com/dashboard/project/slomrtdygughdpenilco/functions/chat-with-ai/logs">Edge Function logs</lov-link>
</lov-actions>

I notice that we need to add better error logging in our Edge Function to understand exactly where and why it's failing. Let me add detailed logging to help us debug this:

<lov-code>
Let's update the chat-with-ai Edge Function to add better error logging:

<lov-write file_path="supabase/functions/chat-with-ai/slack-utils.ts">
import { delay } from "https://deno.land/std@0.168.0/async/delay.ts";

interface SlackAPIResponse {
  ok: boolean;
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function callSlackAPI(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    console.log(`Calling Slack API: ${url}`);
    console.log('Request options:', {
      method: options.method,
      headers: options.headers,
      bodyLength: options.body ? JSON.stringify(options.body).length : 0
    });

    const response = await fetch(url, options);
    const data: SlackAPIResponse = await response.json();

    console.log('Slack API response:', {
      ok: data.ok,
      error: data.error,
      status: response.status
    });

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
    console.error('Detailed error in callSlackAPI:', {
      error: error.message,
      url,
      retryCount: retries
    });

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
  console.log('Starting fetchSlackMessages:', { channelName });
  
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
    console.log('Channels response:', {
      channelCount: channels.channels?.length,
      channelNames: channels.channels?.map((c: any) => c.name)
    });

    const channel = channels.channels?.find((c: any) => c.name === channelName);
    
    if (!channel) {
      console.error(`Channel ${channelName} not found in workspace`);
      throw new Error(`Channel ${channelName} not found`);
    }

    console.log('Found channel:', { 
      channelId: channel.id, 
      channelName: channel.name,
      isMember: channel.is_member,
      isPrivate: channel.is_private 
    });

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
    console.log('Messages response:', {
      ok: messages.ok,
      messageCount: messages.messages?.length,
      hasMore: messages.has_more
    });

    return messages.messages?.map((msg: any) => msg.text) || [];
  } catch (error) {
    console.error('Detailed error in fetchSlackMessages:', {
      error: error.message,
      channelName,
      stack: error.stack
    });
    throw error;
  }
}

export async function sendSlackMessage(channelName: string, message: string, botToken: string) {
  console.log('Starting sendSlackMessage:', { 
    channelName,
    messageLength: message.length 
  });
  
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
    const channel = channels.channels?.find((c: any) => c.name === channelName);
    
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
    console.log('Message sent successfully:', {
      ok: result.ok,
      ts: result.ts,
      channel: result.channel
    });
    return result;
  } catch (error) {
    console.error('Error sending Slack message:', {
      error: error.message,
      channelName,
      stack: error.stack
    });
    throw error;
  }
}