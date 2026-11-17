import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";
import { registry } from "./metrics.js";
import {
  httpRequestsTotal,
  httpRequestDuration,
} from "./metrics.js";
import { checkApiLatency } from "./incident-detector.js";

const server = Fastify({
  logger: {
    level: "info",
  },
});

const requestStartTimes = new WeakMap<object, bigint>();

server.addHook("onRequest", async (request) => {
  requestStartTimes.set(request, process.hrtime.bigint());
});

server.addHook("onResponse", async (request, reply) => {
  const startTime = requestStartTimes.get(request);

  if (!startTime) {
    return;
  }

  const duration =
    Number(process.hrtime.bigint() - startTime) / 1_000_000_000;

  const route = request.routeOptions.url;

  httpRequestsTotal.inc({
    method: request.method,
    route,
    status_code: reply.statusCode.toString(),
  });

  httpRequestDuration.observe(
    {
      method: request.method,
      route,
    },
    duration,
  );
});

async function start() {
  await server.register(cors);

  server.get("/", async () => {
    return {
      name: "Aegis API",
      status: "operational",
    };
  });

  server.get("/health", async () => {
    return {
      status: "healthy",
    };
  });

  server.get("/db-health", async () => {
  const result = await pool.query("SELECT NOW()");

  return {
    status: "healthy",
    database: "connected",
    time: result.rows[0].now,
  };
});

    server.get("/metrics", async (_, reply) => {
  reply.header("Content-Type", registry.contentType);

  return registry.metrics();
});

server.get("/api/orders", async (request, reply) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const startTime = process.hrtime.bigint();

  try {
    const result = await pool.query(`
      SELECT
        id,
        customer_name,
        product,
        amount,
        status,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    const durationMs =
      Number(process.hrtime.bigint() - startTime) / 1_000_000;

    request.log.info({
      event: "database_query",
      query: "get_orders",
      duration_ms: Number(durationMs.toFixed(2)),
      rows: result.rows.length,
    });

    return {
      orders: result.rows,
    };
  } catch (error) {
    const durationMs =
      Number(process.hrtime.bigint() - startTime) / 1_000_000;

    request.log.error({
      event: "database_query_error",
      query: "get_orders",
      duration_ms: Number(durationMs.toFixed(2)),
      error,
    });

    reply.code(500);

    return {
      error: "Failed to retrieve orders",
    };
  }
});

server.get("/api/version", async () => {
  return {
    version: process.env.GIT_COMMIT ?? "unknown",
    environment: process.env.NODE_ENV ?? "development",
  };
});

server.get("/api/incidents", async () => {
  const result = await pool.query(`
    SELECT
      inc.id,
      inc.incident_key,
      inc.severity,
      inc.status,
      inc.title,
      inc.description,
      inc.affected_service,
      inc.detected_at,
      inc.resolved_at,
      inc.git_commit,
      i.id AS investigation_id,
      i.summary AS investigation_summary,
      i.root_cause,
      i.evidence,
      i.recommended_action,
      i.created_at AS investigation_created_at
    FROM incidents inc
    LEFT JOIN investigations i
      ON i.incident_id = inc.id
    ORDER BY inc.detected_at DESC
  `);

  return {
    incidents: result.rows,
  };
});

server.get("/api/investigations", async () => {
  const result = await pool.query(`
    SELECT
      i.id,
      i.incident_id,
      i.summary,
      i.root_cause,
      i.evidence,
      i.recommended_action,
      i.created_at,
      inc.incident_key,
      inc.title AS incident_title
    FROM investigations i
    JOIN incidents inc
      ON i.incident_id = inc.id
    ORDER BY i.created_at DESC
  `);

  return {
    investigations: result.rows,
  };
});


  try {
   console.log("Incident detector started");

setInterval(() => {
  console.log("Running incident detector...");
  checkApiLatency();
}, 10000);
    await server.listen({
      port: 3000,
      host: "0.0.0.0",
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();