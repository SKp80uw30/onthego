import { Vapi, VapiConversation } from '@vapi-ai/web';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class VapiService {
  private client: Vapi | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      console.log('Initializing Vapi service...');
      const { data: { secrets }, error } = await supabase.functions.invoke('get-vapi-keys');
      
      if (error || !secrets?.VAPI_API_KEY || !secrets?.VAPI_ASSISTANT_KEY) {
        console.error('Error getting Vapi keys:', error);
        throw new Error('Failed to get Vapi keys');
      }

      this.client = new Vapi(secrets.VAPI_API_KEY);
      
      this.isInitialized = true;
      console.log('Vapi service initialized successfully');
    } catch (error) {
      console.error('Error initializing Vapi service:', error);
      toast.error('Failed to initialize voice service');
      throw error;
    }
  }

  async startConversation(): Promise<VapiConversation> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Voice service not ready');
    }

    try {
      const conversation = await this.client.start({
        assistant: process.env.VAPI_ASSISTANT_KEY,
        audioConfig: {
          sampleRate: 16000,
          encoding: 'webm'
        }
      });
      return conversation;
    } catch (error) {
      console.error('Error starting Vapi conversation:', error);
      throw error;
    }
  }

  isReady() {
    return this.isInitialized && !!this.client;
  }

  cleanup() {
    this.client = null;
    this.isInitialized = false;
  }
}