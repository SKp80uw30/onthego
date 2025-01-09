import { toast } from 'sonner';
import { VapiState } from '@/types/vapi';

export const createVapiEventHandlers = (updateState: (updates: Partial<VapiState>) => void) => {
  return {
    handleCallStart: () => {
      console.log('Event: call-start triggered');
      updateState({
        status: 'Call in progress',
        isCallActive: true,
        error: null
      });
    },

    handleError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Event: error triggered:', {
        error,
        type: typeof error,
        message: errorMessage
      });
      updateState({
        status: 'Error occurred',
        error: errorMessage,
        isCallActive: false
      });
      toast.error(`Voice assistant error: ${errorMessage}`);
    },

    handleSpeechStart: () => {
      console.log('Event: speech-start triggered');
      updateState({ status: 'Assistant speaking' });
    },

    handleSpeechEnd: () => {
      console.log('Event: speech-end triggered');
      updateState({ status: 'Ready' });
    },

    handleCallEnd: () => {
      console.log('Event: call-end triggered');
      updateState({
        status: 'Call ended',
        isCallActive: false
      });
    }
  };
};