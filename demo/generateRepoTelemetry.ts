import { createDebugPilot } from "../sdk/debugpilot-client.js";

const service = "cex-v2-boilercode";

const client = createDebugPilot({
  service,
  baseUrl: process.env.DEBUGPILOT_URL || "http://localhost:4000",
  timeoutMs: Number(process.env.DEBUGPILOT_TIMEOUT_MS || 30000)
});

type IncidentCluster = {
  name: string;
  message: string;
  min: number;
  max: number;
  startMinute: number;
  spreadMinutes: number;
  metadata: Record<string, unknown>;
  pressure: {
    cpu: number;
    memory: number;
    errorRate: number;
    latency: number;
  };
};

const startedAt = new Date(Date.now() - 5 * 60 * 60 * 1000);

const deployments = [
  { commit: "a8d3e9f", author: "vansh", minute: 12 },
  { commit: "c41b7aa", author: "vansh", minute: 105 },
  { commit: "f92a10d", author: "engine-bot", minute: 205 }
];

const incidentClusters: IncidentCluster[] = [
  {
    name: "redis request response timeout",
    message: "Engine request timeout: no response received within 5000ms",
    min: 40,
    max: 80,
    startMinute: 24,
    spreadMinutes: 42,
    metadata: {
      component: "utils/engine-client",
      file: "backend/src/utils/engine-client.ts",
      line: 31,
      route: "POST /api/exchange/orders",
      redisQueue: "engine:requests",
      responseQueue: "engine:responses"
    },
    pressure: { cpu: 96, memory: 1320, errorRate: 27.8, latency: 2900 }
  },
  {
    name: "engine processing backlog",
    message: "Order processing latency exceeded threshold. Queue backlog detected.",
    min: 25,
    max: 50,
    startMinute: 72,
    spreadMinutes: 36,
    metadata: {
      component: "engine/order-processing",
      file: "engine/src/controllers/orderHandlers.ts",
      line: 18,
      queue: "order-processing",
      orderType: "LIMIT"
    },
    pressure: { cpu: 91, memory: 1180, errorRate: 19.6, latency: 2100 }
  },
  {
    name: "redis brpop response failure",
    message: "Failed to receive engine response from Redis response queue",
    min: 15,
    max: 40,
    startMinute: 113,
    spreadMinutes: 32,
    metadata: {
      component: "redis-subscriber",
      file: "backend/src/utils/engine-client.ts",
      line: 55,
      redisCommand: "BRPOP",
      responseQueue: "engine:responses"
    },
    pressure: { cpu: 84, memory: 910, errorRate: 18.4, latency: 1450 }
  },
  {
    name: "orderbook inconsistency",
    message: "Orderbook state inconsistency detected for symbol BTC_USDT",
    min: 10,
    max: 25,
    startMinute: 151,
    spreadMinutes: 24,
    metadata: {
      component: "exchange-store",
      file: "engine/src/store/exchange-store.ts",
      line: 72,
      symbol: "BTC_USDT",
      orderbookSide: "bid"
    },
    pressure: { cpu: 79, memory: 860, errorRate: 12.5, latency: 1120 }
  },
  {
    name: "undefined payload crash",
    message: "TypeError: Cannot read properties of undefined (reading 'symbol')",
    min: 20,
    max: 60,
    startMinute: 183,
    spreadMinutes: 40,
    metadata: {
      component: "order-handler",
      file: "engine/src/controllers/orderHandlers.ts",
      line: 8,
      event: "CREATE_ORDER",
      payloadState: "undefined"
    },
    pressure: { cpu: 88, memory: 1020, errorRate: 22.7, latency: 1780 }
  },
  {
    name: "balance lock failure",
    message: "Failed to lock user balance before order execution",
    min: 15,
    max: 30,
    startMinute: 226,
    spreadMinutes: 28,
    metadata: {
      component: "balance-manager",
      file: "engine/src/store/exchange-store.ts",
      line: 120,
      asset: "USDT",
      operation: "reserveBalance"
    },
    pressure: { cpu: 74, memory: 820, errorRate: 11.8, latency: 980 }
  },
  {
    name: "market depth generation failure",
    message: "Failed to generate market depth snapshot for BTC_USDT",
    min: 10,
    max: 30,
    startMinute: 258,
    spreadMinutes: 24,
    metadata: {
      component: "depth-service",
      file: "engine/src/store/exchange-store.ts",
      symbol: "BTC_USDT",
      marketData: "depth"
    },
    pressure: { cpu: 67, memory: 760, errorRate: 9.3, latency: 840 }
  },
  {
    name: "invalid symbol processing",
    message: "Symbol ETH_BTC not found in exchange store",
    min: 15,
    max: 35,
    startMinute: 289,
    spreadMinutes: 26,
    metadata: {
      component: "symbol-validation",
      file: "engine/src/store/exchange-store.ts",
      symbol: "ETH_BTC",
      knownSymbols: ["BTC_USDT", "ETH_USDT", "SOL_USDT"]
    },
    pressure: { cpu: 62, memory: 710, errorRate: 7.6, latency: 660 }
  }
];

const clusterRepeatCounts = new Map<string, number>();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function repeatCountFor(cluster: IncidentCluster) {
  const existing = clusterRepeatCounts.get(cluster.name);

  if (existing) {
    return existing;
  }

  const count = randomInt(cluster.min, cluster.max);
  clusterRepeatCounts.set(cluster.name, count);
  return count;
}

function planIncidentCounts() {
  for (const cluster of incidentClusters) {
    repeatCountFor(cluster);
  }

  let total = [...clusterRepeatCounts.values()].reduce((sum, count) => sum + count, 0);
  let guard = 0;

  while (total < 220 && guard < 500) {
    const cluster = incidentClusters[randomInt(0, incidentClusters.length - 1)];
    const current = repeatCountFor(cluster);

    if (current < cluster.max) {
      clusterRepeatCounts.set(cluster.name, current + 1);
      total += 1;
    }

    guard += 1;
  }
}

function atMinute(minute: number) {
  return new Date(startedAt.getTime() + minute * 60 * 1000).toISOString();
}

function jitteredMinute(cluster: IncidentCluster, index: number, total: number) {
  const progress = total <= 1 ? 0 : index / (total - 1);
  const jitter = randomInt(-2, 2);
  return cluster.startMinute + Math.floor(progress * cluster.spreadMinutes) + jitter;
}

function activePressure(minute: number) {
  const active = incidentClusters.find(
    (cluster) => minute >= cluster.startMinute - 8 && minute <= cluster.startMinute + cluster.spreadMinutes + 8
  );

  return active?.pressure;
}

async function runInBatches<T>(items: T[], batchSize: number, label: string, handler: (item: T, index: number) => Promise<unknown>) {
  let completed = 0;

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map((item, batchIndex) => handler(item, index + batchIndex)));
    completed += batch.length;
    console.log(`[telemetry] ${label}: ${completed}/${items.length}`);
  }
}

async function sendDeployments() {
  await runInBatches(deployments, 3, "deployments", async (deployment) => {
    return client.deployment({
      commit: deployment.commit,
      author: deployment.author,
      timestamp: atMinute(deployment.minute)
    });
  });
}

async function sendContinuousMetrics() {
  const metricMinutes = [];
  for (let minute = 0; minute <= 330; minute += 8) {
    metricMinutes.push(minute);
  }

  await runInBatches(metricMinutes, 8, "metrics", async (minute) => {
    const pressure = activePressure(minute);

    return client.metrics({
      cpuUsage: pressure ? randomInt(pressure.cpu - 8, pressure.cpu) : randomInt(34, 58),
      memoryUsage: pressure ? randomInt(pressure.memory - 90, pressure.memory + 80) : randomInt(420, 690),
      requestCount: pressure ? randomInt(18000, 42000) : randomInt(6500, 14000),
      errorRate: pressure ? Number((pressure.errorRate + Math.random() * 3).toFixed(1)) : Number((Math.random() * 1.8).toFixed(1)),
      avgLatency: pressure ? randomInt(pressure.latency - 180, pressure.latency + 260) : randomInt(90, 280),
      timestamp: atMinute(minute)
    });
  });

  await client.metrics({
    cpuUsage: 96,
    memoryUsage: 1320,
    requestCount: 42000,
    errorRate: 27.8,
    avgLatency: 2900,
    timestamp: new Date().toISOString()
  });
  console.log("[telemetry] metrics: final degraded sample sent");
}

async function sendBackgroundLogs() {
  const healthyMessages = [
    "Exchange API accepted order validation request",
    "Engine heartbeat received from Redis channel",
    "Market data snapshot published for BTC_USDT",
    "Orderbook depth recalculated successfully",
    "User balance snapshot persisted after fill settlement"
  ];

  const logMinutes = [];
  for (let minute = 4; minute <= 328; minute += 9) {
    logMinutes.push(minute);
  }

  await runInBatches(logMinutes, 6, "background logs", async (minute) => {
    return client.log(
      "info",
      healthyMessages[randomInt(0, healthyMessages.length - 1)],
      {
        component: "exchange-runtime",
        file: minute % 2 === 0 ? "backend/src/controllers/exchange-controller.ts" : "engine/src/store/exchange-store.ts",
        symbol: "BTC_USDT"
      },
      { timestamp: atMinute(minute) }
    );
  });
}

async function sendIncidentLogs() {
  let totalErrors = 0;
  const errorEvents: Array<{ cluster: IncidentCluster; index: number; repeatCount: number; timestamp: string }> = [];
  planIncidentCounts();

  for (const cluster of incidentClusters) {
    const repeatCount = repeatCountFor(cluster);
    totalErrors += repeatCount;

    for (let index = 0; index < repeatCount; index += 1) {
      const timestamp = atMinute(jitteredMinute(cluster, index, repeatCount));
      errorEvents.push({ cluster, index, repeatCount, timestamp });
    }
  }

  await runInBatches(errorEvents, 8, "incident logs", async (event) => {
    return client.error(event.cluster.message, {
      ...event.cluster.metadata,
      incidentCluster: event.cluster.name,
      sequence: event.index + 1,
      totalInCluster: event.repeatCount,
      serviceArchitecture: ["backend", "engine", "redis", "orderbooks", "balances", "fills", "market-data", "exchange-store"]
    }, { timestamp: event.timestamp });
  });

  return totalErrors;
}

async function main() {
  console.log(`[telemetry] sending cex-v2-boilercode telemetry to ${process.env.DEBUGPILOT_URL || "http://localhost:4000"}`);

  await sendDeployments();
  await sendContinuousMetrics();
  await sendBackgroundLogs();
  const totalErrors = await sendIncidentLogs();

  console.log(`[telemetry] sent ${deployments.length} deployments`);
  console.log("[telemetry] sent continuous metrics across multiple hours");
  console.log(`[telemetry] sent ${totalErrors} incident error logs plus background logs`);
  console.log("[telemetry] wait for the RCA worker to process queued incidents, then open /incidents");
}

main().catch((error) => {
  console.error("[telemetry] failed", error);
  process.exit(1);
});
