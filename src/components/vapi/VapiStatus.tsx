import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface VapiStatusProps {
  status: string;
  error: string | null;
  isCallActive: boolean;
  onToggleCall: () => void;
}

export const VapiStatus = ({ status, error, isCallActive, onToggleCall }: VapiStatusProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <div className="text-lg font-semibold">Voice Assistant Status</div>
      <div className="text-sm text-muted-foreground">{status}</div>
      {error && (
        <div className="text-sm text-red-500 max-w-md text-center">
          Error: {error}
        </div>
      )}
      <Button
        onClick={onToggleCall}
        variant={isCallActive ? "destructive" : "default"}
        className="mt-4"
      >
        {isCallActive ? (
          <>
            <MicOff className="mr-2 h-4 w-4" />
            Stop Assistant
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Assistant
          </>
        )}
      </Button>
    </div>
  );
};