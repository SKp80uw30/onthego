export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface SlackAPIResponse {
  ok: boolean;
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function isRetryableError(error?: string): boolean {
  const retryableErrors = [
    'rate_limited',
    'service_unavailable',
    'timeout',
    'temporary_error'
  ];
  return error ? retryableErrors.includes(error) : false;
}

export async function callSlackAPI(url: string, options: RequestInit, retries = 0): Promise<Response> {
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
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
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
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return callSlackAPI(url, options, retries + 1);
    }
    throw error;
  }
}