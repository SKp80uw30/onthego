import { VapiStatus } from './VapiStatus';
import { useVapi } from '@/hooks/use-vapi';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const { status, error, isCallActive, toggleCall } = useVapi(apiKey, assistantId);

  return (
    <VapiStatus 
      status={status}
      error={error}
      isCallActive={isCallActive}
      onToggleCall={toggleCall}
    />
  );
};