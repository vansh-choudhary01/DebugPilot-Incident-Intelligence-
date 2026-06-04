const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ServiceHealth = {
  service: string;
  totalLogs: number;
  errorCount: number;
  openIncidents: number;
  lastLogAt: string;
  health: "healthy" | "degraded";
};

export type Incident = {
  _id: string;
  title: string;
  service: string;
  fingerprint: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  occurrenceCount: number;
  startedAt: string;
  lastSeenAt: string;
  analysis?: {
    whatHappened: string;
    likelyRootCause: string;
    filesToInspect: string[];
    suggestedFixes: string[];
    confidenceScore: number;
  };
};

export type Alert = {
  _id: string;
  service: string;
  message: string;
  channel: "console" | "webhook";
  status: "sent" | "failed";
  createdAt: string;
};

export type Deployment = {
  _id: string;
  service: string;
  commit: string;
  timestamp: string;
  author?: string;
};

export type MetricPoint = {
  timestamp: string;
  value: number;
};

export type Metric = {
  _id: string;
  service: string;
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  errorRate: number;
  avgLatency: number;
  timestamp: string;
};

export type MetricSummary = {
  service: string;
  latest?: Metric;
  peaks: {
    avgLatency: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  trends: {
    avgLatency: MetricPoint[];
    errorRate: MetricPoint[];
    memoryUsage: MetricPoint[];
    cpuUsage: MetricPoint[];
  };
};

export type Repository = {
  _id: string;
  url: string;
  name: string;
  status: "pending" | "indexed" | "failed";
  indexedAt?: string;
  codeChunkCount?: number;
  lastError?: string;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
