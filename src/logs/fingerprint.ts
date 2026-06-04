const knownPatterns: Array<[RegExp, string]> = [
  [/database|postgres|mysql|mongo|db/i, "db_connection_failed"],
  [/redis|cache/i, "redis_timeout"],
  [/payment|stripe|checkout|invoice/i, "payment_failed"],
  [/auth|jwt|token|login/i, "auth_failed"],
  [/timeout|timed out/i, "timeout"],
  [/rate limit|429/i, "rate_limited"]
];

export function generateFingerprint(message: string) {
  for (const [pattern, fingerprint] of knownPatterns) {
    if (pattern.test(message)) {
      return fingerprint;
    }
  }

  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, "<id>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/["'`].*?["'`]/g, "<value>")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
