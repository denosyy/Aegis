
import axios from "axios";
import { pool } from "./db.js";

const PROMETHEUS_URL = "http://prometheus:9090";
const LATENCY_THRESHOLD_SECONDS = 1;
const REQUIRED_HEALTHY_CHECKS = 3;

let consecutiveHealthyChecks = 0;

export async function checkApiLatency() {
  try {
    const query = `
      increase(http_request_duration_seconds_sum{route="/api/orders"}[5m])
      /
      increase(http_request_duration_seconds_count{route="/api/orders"}[5m])
    `;

    const response = await axios.get(
      `${PROMETHEUS_URL}/api/v1/query`,
      {
        params: { query },
      },
    );

    const result = response.data?.data?.result;

    if (!result || result.length === 0) {
      consecutiveHealthyChecks = 0;

      console.log(
        "[incident-detector] No Prometheus data for /api/orders",
      );
      return;
    }

    const latency = Number(result[0].value[1]);

    if (!Number.isFinite(latency)) {
      consecutiveHealthyChecks = 0;

      console.log(
        "[incident-detector] Not enough recent /api/orders traffic to calculate latency",
      );
      return;
    }

    console.log(
      `[incident-detector] /api/orders latency: ${latency.toFixed(4)}s`,
    );

    // UNHEALTHY: Create an incident if one doesn't already exist.
    if (latency > LATENCY_THRESHOLD_SECONDS) {
      consecutiveHealthyChecks = 0;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const existingIncident = await client.query(
          `
          SELECT id
          FROM incidents
          WHERE title = $1
            AND status != 'resolved'
          LIMIT 1
          `,
          ["API latency threshold exceeded"],
        );

        if (existingIncident.rows.length > 0) {
          await client.query("COMMIT");

          console.log(
            "[incident-detector] Existing active incident found. Skipping creation.",
          );
          return;
        }

        const incidentResult = await client.query(
          `
          INSERT INTO incidents (
            incident_key,
            severity,
            status,
            title,
            description,
            affected_service,
            git_commit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
          `,
          [
            `INC-${Date.now()}`,
            "high",
            "investigating",
            "API latency threshold exceeded",
            `Average /api/orders latency exceeded ${LATENCY_THRESHOLD_SECONDS}s.`,
            "aegis-api",
            process.env.GIT_COMMIT ?? "unknown",
          ],
        );

        const incidentId = incidentResult.rows[0].id;

        await client.query(
          `
          INSERT INTO investigations (
            incident_id,
            summary,
            root_cause,
            evidence,
            recommended_action
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            incidentId,
            "Automatic investigation of API latency incident",
            "API latency exceeded the configured threshold.",
            `Prometheus reported /api/orders latency of ${latency.toFixed(4)} seconds.`,
            "Investigate database performance and optimize slow queries.",
          ],
        );

        await client.query("COMMIT");

        console.log(
          `[incident-detector] Investigation created for incident ${incidentId}`,
        );

        console.log(
          "[incident-detector] Incident created: API latency threshold exceeded",
        );
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }

      return;
    }

    // HEALTHY: Check whether an active incident needs recovery.
    const activeIncident = await pool.query(
      `
      SELECT id
      FROM incidents
      WHERE title = $1
        AND status != 'resolved'
      LIMIT 1
      `,
      ["API latency threshold exceeded"],
    );

    if (activeIncident.rows.length === 0) {
      consecutiveHealthyChecks = 0;
      return;
    }

    consecutiveHealthyChecks++;

    console.log(
      `[incident-detector] Healthy check ${consecutiveHealthyChecks}/${REQUIRED_HEALTHY_CHECKS}`,
    );

    if (consecutiveHealthyChecks >= REQUIRED_HEALTHY_CHECKS) {
      const incidentId = activeIncident.rows[0].id;

      const resolutionResult = await pool.query(
        `
        UPDATE incidents
        SET status = 'resolved'
        WHERE id = $1
          AND status != 'resolved'
        RETURNING id
        `,
        [incidentId],
      );

      if (resolutionResult.rows.length > 0) {
        console.log(
          `[incident-detector] Incident ${incidentId} automatically resolved.`,
        );
      }

      consecutiveHealthyChecks = 0;
    }
  } catch (error) {
    console.error("[incident-detector] Detection failed:", error);
  }
}
