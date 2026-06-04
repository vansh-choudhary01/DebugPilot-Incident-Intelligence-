# DebugPilot Client

This is a tiny Node.js client wrapper for services that want to send logs, metrics, and deployments to DebugPilot without manually calling every API endpoint.

Copy `debugpilot-client.ts` into your service, or import it directly if this repo is available locally.

## Setup

```js
import { createDebugPilot } from "./debugpilot-client";

export const debugPilot = createDebugPilot({
  service: "workflow-engine",
  baseUrl: process.env.DEBUGPILOT_URL || "http://localhost:4000",
  autoMetrics: true
});
```

With `autoMetrics: true`, the SDK sends process CPU, memory, request count, error rate, and average latency every 60 seconds.

## Send Errors

```js
try {
  await executor.executePlan(userId, steps, context);
} catch (error) {
  await debugPilot.error(error, {
    component: "backend/executor",
    file: "backend/executor/executor.js",
    route: "POST /api/workflow/:id/approve"
  });

  throw error;
}
```

## Wrap Functions

```js
const approveWorkflowSafely = debugPilot.wrapAsync(
  approveWorkflow,
  (req) => ({
    component: "workflow-controller",
    route: req.originalUrl,
    workflowId: req.params.id
  })
);
```

## Express Error Middleware

Place request metrics before routes. Place error reporting before your normal error response handler.

```js
app.use(debugPilot.expressRequestMetrics());

app.use(debugPilot.expressErrorHandler({
  component: "express"
}));
```

## Send Metrics

Most services should not calculate these manually. Use automatic metrics above.

Manual metrics are still available for custom workers or queue consumers:

```js
await debugPilot.metrics({
  cpuUsage: 72,
  memoryUsage: 640,
  requestCount: 1200,
  errorRate: 6.4,
  avgLatency: 420
});
```

## Send Deployment Events

```js
await debugPilot.deployment({
  commit: process.env.GIT_COMMIT,
  author: process.env.DEPLOY_AUTHOR
});
```
