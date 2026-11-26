import type { Schedule } from "@gridkitjs/forms-core";

/**
 * The browser's timers as a forms-core `Schedule`: runs `callback` once
 * after `delay` milliseconds, and the function it returns clears the timer.
 * Clearing after the callback has run does nothing.
 */
export const scheduleTimeout: Schedule = (callback, delay) => {
  const timer = setTimeout(callback, delay);
  return () => {
    clearTimeout(timer);
  };
};
