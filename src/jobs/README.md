Jobs are intentionally minimal in the MVP.

The API process enqueues root cause analysis work in Redis with BullMQ. The worker process loads incidents, runs RCA, stores incident memory, and sends alerts.
