import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db.js";
import { registry } from "./metrics.js";
import {
  httpRequestsTotal,
  httpRequestDuration,
} from "./metrics.js";

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
  try {
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