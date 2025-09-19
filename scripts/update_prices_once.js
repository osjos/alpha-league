// scripts/update_prices_once.js
import { tickUpdatePrices } from "./update_prices_core.js";

(async () => {
  try {
    const res = await tickUpdatePrices();
    console.log("✅ Done", res);
    process.exit(0);
  } catch (e) {
    console.error("❌ Update failed:", e);
    process.exit(1);
  }
})();