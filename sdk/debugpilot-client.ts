type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

type DebugPilotOptions = {
  service?: string;
  baseUrl?: string;
  enabled?: boolean;
  timeoutMs?: number;
  autoMetrics?: boolean;
  metricsIntervalMs?: number;
};

type Metadata = Record<string, unknown>;

type LogOptions = {
  timestamp?: string;
};

type MetricPayload = {
  cpuUsage?: number;
  memoryUsage?: number;
  requestCount?: number;
  errorRate?: number;
  avgLatency?: number;
  timestamp?: string;
};

type DeploymentPayload = {
  commit: string;
  author?: string;
  timestamp?: string;
};

type ExpressLikeRequest = {
  originalUrl?: string;
  url?: string;
  method?: string;
};

type ExpressLikeResponse = {
  statusCode?: number;
  once?: (event: "finish", callback: () => void) => void;
};

type ExpressLikeNext = (error?: unknown) => void;

function envValue(key: string) {
  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env[key];
}

export function createDebugPilot(options: DebugPilotOptions = {}) {
  const baseUrl = options.baseUrl || envValue("DEBUGPILOT_URL") || "http://localhost:4000";
  const service = options.service || envValue("SERVICE_NAME") || "unknown-service";
  const enabled = options.enabled ?? envValue("DEBUGPILOT_ENABLED") !== "false";
  const timeoutMs = options.timeoutMs ?? Number(envValue("DEBUGPILOT_TIMEOUT_MS") || 20000);
  const metricsIntervalMs = options.metricsIntervalMs ?? Number(envValue("DEBUGPILOT_METRICS_INTERVAL_MS") || 60000);
  let windowStartedAt = Date.now();
  let requestCount = 0;
  let errorCount = 0;
  let totalLatencyMs = 0;
  let lastCpuUsage = process.cpuUsage?.();
  let lastCpuMeasuredAt = Date.now();

  async function send(path: string, payload: unknown) {
    if (!enabled) {
      return undefined;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text();
        console.warn(`[debugpilot] failed to send ${path}: ${response.status} ${body}`);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[debugpilot] telemetry send failed:", message);
      return undefined;
    }
  }

  function normalizeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return {
      message: String(error)
    };
  }

  async function log(level: LogLevel, message: string, metadata: Metadata = {}, options: LogOptions = {}) {
    return send("/logs", {
      service,
      level,
      message,
      metadata,
      timestamp: options.timestamp || new Date().toISOString()
    });
  }

  async function error(errorOrMessage: unknown, metadata: Metadata = {}, options: LogOptions = {}) {
    const normalized =
      typeof errorOrMessage === "string" ? { message: errorOrMessage } : normalizeError(errorOrMessage);

    return log("error", normalized.message, {
      ...metadata,
      error: normalized
    }, options);
  }

  function processMemoryMb() {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return 0;
    }

    return Math.round(process.memoryUsage().rss / 1024 / 1024);
  }

  function processCpuPercent() {
    if (typeof process === "undefined" || !process.cpuUsage || !lastCpuUsage) {
      return 0;
    }

    const now = Date.now();
    const current = process.cpuUsage();
    const elapsedMicros = Math.max((now - lastCpuMeasuredAt) * 1000, 1);
    const usedMicros = current.user + current.system - lastCpuUsage.user - lastCpuUsage.system;

    lastCpuUsage = current;
    lastCpuMeasuredAt = now;

    return Math.max(0, Math.min(100, Number(((usedMicros / elapsedMicros) * 100).toFixed(1))));
  }

  function recordRequest(durationMs: number, failed = false) {
    requestCount += 1;
    totalLatencyMs += Math.max(durationMs, 0);

    if (failed) {
      errorCount += 1;
    }
  }

  async function flushMetrics(values: Pick<MetricPayload, "cpuUsage" | "memoryUsage" | "timestamp"> = {}) {
    const count = requestCount;
    const errors = errorCount;
    const latency = totalLatencyMs;

    requestCount = 0;
    errorCount = 0;
    totalLatencyMs = 0;
    windowStartedAt = Date.now();

    return metrics({
      cpuUsage: values.cpuUsage ?? processCpuPercent(),
      memoryUsage: values.memoryUsage ?? processMemoryMb(),
      requestCount: count,
      errorRate: count === 0 ? 0 : Number(((errors / count) * 100).toFixed(2)),
      avgLatency: count === 0 ? 0 : Math.round(latency / count),
      timestamp: values.timestamp || new Date().toISOString()
    });
  }

  async function metrics(values: MetricPayload = {}) {
    return send("/metrics", {
      service,
      cpuUsage: values.cpuUsage ?? processCpuPercent(),
      memoryUsage: values.memoryUsage ?? processMemoryMb(),
      requestCount: values.requestCount ?? requestCount,
      errorRate: values.errorRate ?? (requestCount === 0 ? 0 : Number(((errorCount / requestCount) * 100).toFixed(2))),
      avgLatency: values.avgLatency ?? (requestCount === 0 ? 0 : Math.round(totalLatencyMs / requestCount)),
      timestamp: values.timestamp || new Date().toISOString()
    });
  }

  async function deployment(values: DeploymentPayload) {
    return send("/deployments", {
      service,
      commit: values.commit,
      author: values.author,
      timestamp: values.timestamp || new Date().toISOString()
    });
  }

  function wrapAsync<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    metadataFactory?: (...args: TArgs) => Metadata
  ) {
    return async function debugPilotWrappedFunction(...args: TArgs) {
      const startedAt = Date.now();
      try {
        const result = await fn(...args);
        recordRequest(Date.now() - startedAt, false);
        return result;
      } catch (caughtError) {
        recordRequest(Date.now() - startedAt, true);
        const metadata = metadataFactory ? metadataFactory(...args) : {};
        await error(caughtError, metadata);
        throw caughtError;
      }
    };
  }

  function expressErrorHandler(defaultMetadata: Metadata = {}) {
    return async function debugPilotExpressErrorHandler(
      err: unknown,
      req: ExpressLikeRequest,
      _res: unknown,
      next: ExpressLikeNext
    ) {
      await error(err, {
        ...defaultMetadata,
        route: req.originalUrl || req.url,
        method: req.method
      });
      next(err);
    };
  }

  function expressRequestMetrics() {
    return function debugPilotExpressRequestMetrics(
      _req: ExpressLikeRequest,
      res: ExpressLikeResponse,
      next: ExpressLikeNext
    ) {
      const startedAt = Date.now();

      res.once?.("finish", () => {
        recordRequest(Date.now() - startedAt, (res.statusCode ?? 200) >= 500);
      });

      next();
    };
  }

  function startAutoMetrics() {
    if (typeof setInterval === "undefined") {
      return undefined;
    }

    const timer = setInterval(() => {
      void flushMetrics();
    }, metricsIntervalMs);

    if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") {
      timer.unref();
    }

    return timer;
  }

  if (options.autoMetrics) {
    startAutoMetrics();
  }

  return {
    log,
    info: (message: string, metadata?: Metadata) => log("info", message, metadata),
    warn: (message: string, metadata?: Metadata) => log("warn", message, metadata),
    error,
    metrics,
    recordRequest,
    flushMetrics,
    startAutoMetrics,
    deployment,
    wrapAsync,
    expressRequestMetrics,
    expressErrorHandler
  };
}
