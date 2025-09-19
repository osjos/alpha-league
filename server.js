// server.js
// Simple Express server for API endpoints and scheduled tasks
import express from "express";
import cors from "cors";
import { tickUpdatePrices } from "./scripts/update_prices_core.js";

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Price update endpoint: POST /cron/update-prices`);
});