'use client';

import { motion, MotionProps } from 'framer-motion';
import React from 'react';

type Props = React.PropsWithChildren<{
  className?: string;
}> & MotionProps;

export function AnimatedContainer({ children, className, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, className, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, translateY: -2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 ${className || ''}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className, delay = 0, ...rest }: Props & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}





