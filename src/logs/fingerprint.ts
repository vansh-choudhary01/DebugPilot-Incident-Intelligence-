const knownPatterns: Array<[RegExp, string]> = [
  [/engine request timeout.*no response received/i, "engine_request_timeout"],
  [/order processing latency.*queue backlog/i, "engine_processing_backlog"],
  [/failed to receive engine response.*redis response queue/i, "redis_brpop_response_failure"],
  [/orderbook state inconsistency/i, "orderbook_inconsistency"],
  [/cannot read properties of undefined.*symbol/i, "undefined_symbol_payload_crash"],
  [/failed to lock user balance/i, "balance_lock_failure"],
  [/failed to generate market depth snapshot/i, "market_depth_generation_failure"],
  [/symbol .* not found in exchange store/i, "invalid_symbol_processing"],
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
