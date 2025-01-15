import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardTitleProps {
  title: React.ReactNode;
  isCompleted?: boolean;
}

export const CardTitle = ({ title, isCompleted }: CardTitleProps) => {
  return (
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
  );
};