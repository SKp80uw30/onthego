import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardIcon } from './card/CardIcon';
import { CardTitle } from './card/CardTitle';
import { CardContent } from './card/CardContent';

interface OnboardingCardProps {
  title: React.ReactNode;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  content?: React.ReactNode;
  className?: string;
  isCompleted?: boolean;
  isDisabled?: boolean;
}

export const OnboardingCard = ({
  title,
  description,
  icon,
  children,
  content,
  className,
  isCompleted,
  isDisabled,
}: OnboardingCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={!isDisabled ? { scale: 1.01 } : undefined}
      transition={{ 
        duration: 0.3,
        scale: {
          type: "spring",
          stiffness: 300,
          damping: 20
        }
      }}
      className={cn(
        'glass-morphism rounded-xl p-4 md:p-6 card-hover',
        'border border-white/20 transition-all duration-300',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between space-x-3 md:space-x-4">
          <div className="flex items-start space-x-3 md:space-x-4 flex-grow">
            {icon && <CardIcon icon={icon} isDisabled={isDisabled} />}
            <div className="space-y-0.5 md:space-y-1">
              <CardTitle title={title} isCompleted={isCompleted} />
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {children && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-shrink-0 w-[140px]"
            >
              {children}
            </motion.div>
          )}
        </div>
        
        {content && <CardContent content={content} />}
      </div>
    </motion.div>
  );
};