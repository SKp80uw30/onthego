import React from 'react';
import { motion } from 'framer-motion';

interface CardContentProps {
  content: React.ReactNode;
}

export const CardContent = ({ content }: CardContentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      {content}
    </motion.div>
  );
};