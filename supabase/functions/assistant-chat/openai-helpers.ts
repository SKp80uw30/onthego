import OpenAI from "npm:openai@4.26.0";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createOpenAIClient() {
  console.log('Creating OpenAI client');
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment');
  }
  
  // Create client without manual beta header - SDK handles it
  const client = new OpenAI({ apiKey });

  // Test the client configuration
  console.log('OpenAI client created with configuration:', {
    hasApiKey: !!client.apiKey,
    baseURL: client.baseURL
  });

  return client;
}

export async function createThread(openai: OpenAI) {
  try {
    console.log('Creating new thread with OpenAI');
    const thread = await openai.beta.threads.create();
    console.log('Thread created successfully:', {
      threadId: thread.id,
      created: thread.created_at,
      object: thread.object
    });
    return thread;
  } catch (error) {
    console.error('Detailed error in createThread:', {
      error,
      message: error.message,
      type: error.constructor.name,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}

export async function addMessageToThread(openai: OpenAI, threadId: string, content: string) {
  try {
    console.log('Adding message to thread:', { threadId, contentLength: content.length });
    const message = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: content
    });
    console.log('Message added successfully:', {
      messageId: message.id,
      threadId: message.thread_id,
      role: message.role
    });
    return message;
  } catch (error) {
    console.error('Error adding message to thread:', {
      error,
      threadId,
      contentLength: content.length,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}

export async function createRun(openai: OpenAI, threadId: string, assistantId: string) {
  try {
    console.log('Creating run for thread:', { threadId, assistantId });
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    console.log('Run created successfully:', {
      runId: run.id,
      status: run.status,
      threadId: run.thread_id,
      assistantId: run.assistant_id
    });
    return run;
  } catch (error) {
    console.error('Error creating run:', {
      error,
      threadId,
      assistantId,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}

export async function waitForRunCompletion(openai: OpenAI, threadId: string, runId: string) {
  try {
    console.log('Waiting for run completion:', { threadId, runId });
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log('Initial run status:', run.status);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (run.status === 'queued' || run.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 30 seconds');
      }
      
      console.log(`Run status (attempt ${attempts + 1}):`, run.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, runId);
      attempts++;
    }
    
    console.log('Run completed with final status:', {
      status: run.status,
      completedAt: run.completed_at,
      runId: run.id
    });
    return run;
  } catch (error) {
    console.error('Error waiting for run completion:', {
      error,
      threadId,
      runId,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}

export async function getThreadMessages(openai: OpenAI, threadId: string) {
  try {
    console.log('Retrieving messages for thread:', threadId);
    const messages = await openai.beta.threads.messages.list(threadId);
    console.log('Messages retrieved successfully:', {
      count: messages.data.length,
      threadId,
      firstMessageId: messages.data[0]?.id
    });
    return messages;
  } catch (error) {
    console.error('Error retrieving thread messages:', {
      error,
      threadId,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}