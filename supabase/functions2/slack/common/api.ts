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
    logInfo('callSlackApi', `Calling Slack API: ${endpoint}`, {
      method,
      hasParams: Object.keys(params).length > 0
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
    } else {
      config.body = JSON.stringify(params);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Unknown Slack API error');
    }

    logInfo('callSlackApi', `Successfully called ${endpoint}`, {
      statusCode: response.status,
      endpoint
    });

    return data;
  } catch (error) {
    logError('callSlackApi', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}