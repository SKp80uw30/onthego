import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  onStart: () => void;
  onStop: () => void;
  isListening?: boolean;
  className?: string;
}

export const VoiceButton = ({
  onStart,
  onStop,
  isListening = false,
  className,
}: VoiceButtonProps) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setRipples((prev) => [...prev, { id: Date.now(), x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== Date.now()));
    }, 1000);
  };

  return (
    <button
      onClick={handleClick}
      onMouseDown={createRipple}
      className={cn(
        'relative overflow-hidden rounded-full p-4 transition-all duration-300',
        isListening ? 'bg-primary text-white' : 'bg-secondary text-foreground',
        'hover:shadow-lg active:scale-95',
        className
      )}
    >
      <div className="relative z-10">
        {isListening ? (
          <Mic className="h-6 w-6 animate-pulse" />
        ) : (
          <MicOff className="h-6 w-6" />
        )}
      </div>
      {ripples.map(({ id, x, y }) => (
        <span
          key={id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{
            left: x,
            top: y,
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};