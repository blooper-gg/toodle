const warnings: Map<string, boolean> = new Map<string, boolean>();
/**
 * Useful for warning in a function run every frame if you only want to warn once
 *
 * @param key a unique key to tag the warning
 * @param msg message to console.warn
 */
export function warnOnce(key: string, msg?: string) {
  if (warnings.has(key)) {
    return;
  }
  warnings.set(key, true);
  console.warn(msg ?? key);
}
