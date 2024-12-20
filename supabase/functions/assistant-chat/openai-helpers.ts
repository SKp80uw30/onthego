import OpenAI from "npm:openai@4.26.0";

export function createOpenAIClient() {
  console.log('Creating OpenAI client with v2 beta header');
  return new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    baseOptions: {
      headers: {
        'OpenAI-Beta': 'assistants=v2'
      }
    }
  });
}

export async function createThread(openai: OpenAI) {
  try {
    console.log('Creating new thread with OpenAI v2');
    const thread = await openai.beta.threads.create();
    console.log('Thread created successfully:', thread.id);
    return thread;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

export async function addMessageToThread(openai: OpenAI, threadId: string, content: string) {
  try {
    console.log('Adding message to thread:', threadId);
    const message = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: content
    });
    console.log('Message added successfully');
    return message;
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

export async function createRun(openai: OpenAI, threadId: string, assistantId: string) {
  try {
    console.log('Creating run for thread:', threadId);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    console.log('Run created successfully:', run.id);
    return run;
  } catch (error) {
    console.error('Error creating run:', error);
    throw error;
  }
}

export async function waitForRunCompletion(openai: OpenAI, threadId: string, runId: string) {
  try {
    console.log('Waiting for run completion:', runId);
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    while (run.status === 'queued' || run.status === 'in_progress') {
      console.log('Run status:', run.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, runId);
    }
    
    console.log('Run completed with status:', run.status);
    return run;
  } catch (error) {
    console.error('Error waiting for run completion:', error);
    throw error;
  }
}

export async function getThreadMessages(openai: OpenAI, threadId: string) {
  try {
    console.log('Retrieving messages for thread:', threadId);
    const messages = await openai.beta.threads.messages.list(threadId);
    console.log('Messages retrieved successfully');
    return messages;
  } catch (error) {
    console.error('Error retrieving thread messages:', error);
    throw error;
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};