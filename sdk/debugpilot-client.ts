type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

type DebugPilotOptions = {
  service?: string;
  baseUrl?: string;
  enabled?: boolean;
  timeoutMs?: number;
};

type Metadata = Record<string, unknown>;

type LogOptions = {
  timestamp?: string;
};

type MetricPayload = {
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  errorRate: number;
  avgLatency: number;
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

  async function metrics(values: MetricPayload) {
    return send("/metrics", {
      service,
      cpuUsage: values.cpuUsage,
      memoryUsage: values.memoryUsage,
      requestCount: values.requestCount,
      errorRate: values.errorRate,
      avgLatency: values.avgLatency,
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
      try {
        return await fn(...args);
      } catch (caughtError) {
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

  return {
    log,
    info: (message: string, metadata?: Metadata) => log("info", message, metadata),
    warn: (message: string, metadata?: Metadata) => log("warn", message, metadata),
    error,
    metrics,
    deployment,
    wrapAsync,
    expressErrorHandler
  };
}
