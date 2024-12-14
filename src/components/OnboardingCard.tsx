import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OnboardingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export const OnboardingCard = ({
  title,
  description,
  icon,
  className,
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
        <div className="space-y-0.5 md:space-y-1">
          <h3 className="text-base md:text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};