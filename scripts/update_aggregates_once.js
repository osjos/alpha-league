// scripts/update_aggregates_once.js
import { tickUpdateAggregates } from "./update_aggregates_core.js";

(async () => {
  try {
    const res = await tickUpdateAggregates();
    console.log("✅ Aggregates done", res);
    process.exit(0);
  } catch (e) {
    console.error("❌ Aggregates failed:", e);
    process.exit(1);
  }
})();