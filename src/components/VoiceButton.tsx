import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  const handleClick = async () => {
    try {
      if (isListening) {
        onStop();
      } else {
        onStart();
      }
    } catch (error) {
      console.error('Error handling voice button click:', error);
      toast.error('Error accessing microphone');
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
      onTouchStart={(e) => {
        const touch = e.touches[0];
        createRipple({
          clientX: touch.clientX,
          clientY: touch.clientY,
          currentTarget: e.currentTarget,
        } as React.MouseEvent<HTMLButtonElement>);
      }}
      className={cn(
        'relative overflow-hidden rounded-full p-5 md:p-6 transition-all duration-300',
        isListening ? 'bg-primary text-white' : 'bg-secondary text-foreground',
        'hover:shadow-lg active:scale-95 touch-none',
        className
      )}
    >
      <div className="relative z-10">
        {isListening ? (
          <Mic className="h-7 w-7 md:h-8 md:w-8 animate-pulse" />
        ) : (
          <MicOff className="h-7 w-7 md:h-8 md:w-8" />
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