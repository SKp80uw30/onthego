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
    console.log(`Calling Slack API: ${url}`, {
      method: options.method,
      hasBody: !!options.body,
      headers: options.headers
    });

    const response = await fetch(url, options);
    
    // Clone the response before consuming it
    const responseClone = response.clone();
    
    try {
      const data = await responseClone.json();
      console.log('Slack API raw response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok || !data.ok) {
        const error = data.error || `HTTP ${response.status}`;
        console.error('Slack API error:', { error, data });
        
        if (retries < MAX_RETRIES && isRetryableError(data.error)) {
          console.log(`Retrying Slack API call (attempt ${retries + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return callSlackAPI(url, options, retries + 1);
        }
        
        throw new Error(`Slack API error: ${error}`);
      }

      return response;
    } catch (parseError) {
      console.error('Error parsing Slack API response:', parseError);
      throw new Error(`Failed to parse Slack API response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Detailed error in callSlackAPI:', {
      error: error.message,
      url,
      retryCount: retries,
      stack: error.stack
    });

    if (retries < MAX_RETRIES) {
      console.log(`Retrying due to error: ${error.message} (attempt ${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return callSlackAPI(url, options, retries + 1);
    }
    throw error;
  }
}