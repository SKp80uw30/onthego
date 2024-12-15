import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface OnboardingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  isCompleted?: boolean;
}

export const OnboardingCard = ({
  title,
  description,
  icon,
  children,
  className,
  isCompleted,
}: OnboardingCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'glass-morphism rounded-xl p-4 md:p-6 card-hover',
        'border border-white/20',
        className
      )}
    >
      <div className="flex items-start space-x-3 md:space-x-4">
        <div className="rounded-full bg-primary/10 p-2 md:p-3">
          {icon}
        </div>
        <div className="space-y-0.5 md:space-y-1 flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-foreground">{title}</h3>
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </motion.div>
  );
};