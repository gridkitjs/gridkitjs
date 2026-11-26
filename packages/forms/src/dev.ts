// Bundlers replace `process.env.NODE_ENV` with a string; without one, as in
// a browser loading the files unbundled, `process` does not exist.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const warned = new Set<string>();

/** Warns once per page about `key`, in a development build only. */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key) || !isDevelopment()) {
    return;
  }
  warned.add(key);
  console.warn(`@gridkitjs/forms: ${message}`);
}
