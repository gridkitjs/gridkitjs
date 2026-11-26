/**
 * How serious a field's message is. Only `"error"` blocks a commit or a
 * submit; the others are shown and never stop the user. Growable: a later
 * release may add a severity.
 */
export type Severity = "error" | "warning" | "info" | "success";

/** Every severity, most serious first: the order messages are shown in. */
const BY_SERIOUSNESS: readonly Severity[] = [
  "error",
  "warning",
  "info",
  "success",
];

/**
 * The most serious of `severities`, or `null` when there are none. A field
 * showing several messages takes the state of the most serious one.
 */
export function mostSevere(severities: Iterable<Severity>): Severity | null {
  const present = new Set(severities);
  return BY_SERIOUSNESS.find((severity) => present.has(severity)) ?? null;
}
