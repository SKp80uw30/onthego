import { SlackApiResponse } from './types.ts';
import { logError, logInfo } from '../../_shared/logging.ts';

export async function callSlackApi(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST',
  params: Record<string, any> = {}
): Promise<SlackApiResponse> {
  const baseUrl = 'https://slack.com/api';
  const url = new URL(`${baseUrl}/${endpoint}`);
  
  try {
    logInfo('callSlackApi', `Starting API call to ${endpoint}`, {
      method,
      hasParams: Object.keys(params).length > 0,
      endpoint
    });

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
      logInfo('callSlackApi', 'Appended query parameters', {
        endpoint,
        finalUrl: url.toString()
      });
    } else {
      config.body = JSON.stringify(params);
      logInfo('callSlackApi', 'Added request body', {
        endpoint,
        bodyLength: config.body.length
      });
    }

    logInfo('callSlackApi', 'Sending request', {
      endpoint,
      url: url.toString(),
      method,
      headers: Object.keys(headers)
    });

    const response = await fetch(url, config);
    
    if (!response.ok) {
      logError('callSlackApi', `HTTP error! status: ${response.status}`, {
        endpoint,
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      logError('callSlackApi', 'Slack API error', {
        endpoint,
        error: data.error,
        warning: data.warning,
        metadata: data.response_metadata
      });
      throw new Error(data.error || 'Unknown Slack API error');
    }

    logInfo('callSlackApi', `Successfully called ${endpoint}`, {
      statusCode: response.status,
      endpoint,
      hasWarning: !!data.warning
    });

    return data;
  } catch (error) {
    logError('callSlackApi', error instanceof Error ? error : new Error(String(error)), {
      endpoint,
      method,
      error_type: error.constructor.name,
      error_stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}