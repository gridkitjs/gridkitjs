/**
 * The one global this package touches. Declared here rather than taken from a
 * `lib`, which would bring the whole DOM (or Node) along with it: every
 * runtime core runs in has a `console`, and this is all of it core uses.
 */
declare const console: { error: (message: string) => void };

/**
 * Tells the developer about a mistake that does not stop the grid working —
 * two settings that contradict each other, state that cannot be saved — so it
 * is reported rather than thrown.
 */
export function reportError(message: string): void {
  console.error(`GridKit: ${message}`);
}
