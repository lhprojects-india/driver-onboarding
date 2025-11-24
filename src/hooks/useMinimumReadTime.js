import { useState, useEffect, useRef } from 'react';

/**
 * Hook to enforce minimum read time on a page
 * @param {number} minimumSeconds - Minimum time in seconds (default: 30)
 * @returns {object} - { canProceed, timeRemaining, timeElapsed }
 */
export function useMinimumReadTime(minimumSeconds = 30) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Start tracking time when component mounts
    startTimeRef.current = Date.now();
    setTimeElapsed(0);
    setCanProceed(false);

    // Update time every second
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(elapsed);
      
      if (elapsed >= minimumSeconds) {
        setCanProceed(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [minimumSeconds]);

  const timeRemaining = Math.max(0, minimumSeconds - timeElapsed);

  return {
    canProceed,
    timeRemaining,
    timeElapsed,
    minimumSeconds
  };
}

