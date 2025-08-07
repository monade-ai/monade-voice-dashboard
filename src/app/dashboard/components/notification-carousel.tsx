'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const notifications = [
  'Agent Smith has a high drop-off rate.',
  'Campaign \'Summer Sale\' completed.',
  'Campaign \'Q3 Outreach\' for Agent 007 has started.',
  'New lead assigned to Agent Carter.',
  'Server maintenance scheduled for 2 AM.',
];

export function NotificationCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prevIndex) => (prevIndex + 1) % notifications.length);
    }, 3000);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-card rounded-xl border border-border overflow-hidden">
      <AnimatePresence>
        {[-2, -1, 0, 1, 2].map((i) => {
          const cardIndex = (index + i + notifications.length) % notifications.length;
          const isCenter = i === 0;
          const isVisible = Math.abs(i) <= 1;

          return (
            <motion.div
              key={cardIndex}
              initial={{
                x: `${i * 100}%`,
                scale: isCenter ? 1 : 0.8,
                opacity: isVisible ? 1 : 0,
              }}
              animate={{
                x: `${i * 20 - 10}%`,
                y: isCenter ? 0 : 20,
                scale: isCenter ? 1 : 0.8,
                zIndex: notifications.length - Math.abs(i),
                opacity: isVisible ? 1 : 0,
              }}
              exit={{
                x: i < 0 ? '-100%' : '100%',
                opacity: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className={`absolute w-4/5 h-3/4 p-6 flex items-center justify-center rounded-lg shadow-lg border ${isCenter ? 'bg-primary/10 border-primary' : 'bg-card border-border'}`}
            >
              <p className={`text-center text-lg font-semibold ${isCenter ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {notifications[cardIndex]}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}