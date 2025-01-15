import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface OnboardingCardProps {
  title: React.ReactNode;  // Changed from string to ReactNode
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
            {icon && (
              <motion.div 
                className="rounded-full bg-primary/10 p-2 md:p-3"
                whileHover={!isDisabled ? { scale: 1.05, rotate: 5 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {icon}
              </motion.div>
            )}
            <div className="space-y-0.5 md:space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-semibold text-foreground">{title}</h3>
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 17
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </motion.div>
                )}
              </div>
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
        
        {content && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            {content}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};