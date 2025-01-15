import React from 'react';
import { motion } from 'framer-motion';

interface CardIconProps {
  icon: React.ReactNode;
  isDisabled?: boolean;
}

export const CardIcon = ({ icon, isDisabled }: CardIconProps) => {
  return (
    <motion.div 
      className="rounded-full bg-primary/10 p-2 md:p-3"
      whileHover={!isDisabled ? { scale: 1.05, rotate: 5 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {icon}
    </motion.div>
  );
};