/**
 * Runs `callback` once after `delay` milliseconds and returns the function
 * that cancels it. forms-core keeps no timers of its own, so it can run
 * anywhere: whoever drives a field hands it one of these, the browser's
 * timers in a page and a fake one in a test.
 */
export type Schedule = (callback: () => void, delay: number) => () => void;
