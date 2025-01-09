export interface VapiState {
  status: string;
  error: string | null;
  isCallActive: boolean;
}

export type VapiEventType = 'call-start' | 'call-end' | 'speech-start' | 'speech-end' | 'error';