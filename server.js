// server.js
// Simple Express server for API endpoints and scheduled tasks
import express from "express";
import cors from "cors";
import { tickUpdatePrices } from "./scripts/update_prices_core.js";
import { tickUpdateAggregates } from "./scripts/update_aggregates_core.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add a lightweight auth token for safety (set in Replit Secrets)
const CRON_TOKEN = process.env.CRON_TOKEN;

// Price update endpoint for scheduled tasks
app.post("/cron/update-prices", async (req, res) => {
  try {
    if (!CRON_TOKEN || req.headers["x-cron-token"] !== CRON_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const result = await tickUpdatePrices();
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error("Cron update-prices error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Aggregates update endpoint for scheduled tasks
app.post("/cron/update-aggregates", async (req, res) => {
  try {
    if (!process.env.CRON_TOKEN || req.headers["x-cron-token"] !== process.env.CRON_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const result = await tickUpdateAggregates();
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error("Cron update-aggregates error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Combined endpoint: updates prices then aggregates in sequence
app.post("/cron/tick", async (req, res) => {
  try {
    if (!process.env.CRON_TOKEN || req.headers["x-cron-token"] !== process.env.CRON_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const prices = await tickUpdatePrices();
    const aggs   = await tickUpdateAggregates();
    return res.json({ ok: true, prices, aggs });
  } catch (e) {
    console.error("Cron tick error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Price update endpoint: POST /cron/update-prices`);
  console.log(`Aggregates update endpoint: POST /cron/update-aggregates`);
  console.log(`Combined tick endpoint: POST /cron/tick`);
});

// Optional: dev-only background loop (disable in prod)
const PRICE_UPDATE_MS = +(process.env.PRICE_UPDATE_MS || 0); // e.g., 60000 for 1 min
if (PRICE_UPDATE_MS > 0) {
  console.log(`Dev loop: updating prices every ${PRICE_UPDATE_MS} ms`);
  setInterval(() => {
    tickUpdatePrices().catch(e => console.error("Loop update error:", e));
  }, PRICE_UPDATE_MS);
}