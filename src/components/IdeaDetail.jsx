import React from "react";
import { useLivePrice } from "../hooks/useLivePrice";
import { computeIdeaPnL } from "../lib/pnl";

export default function IdeaDetail({ idea, fills }) {
  // Adjust symbol field as needed - using 'asset' since that's what IdeaCard uses
  const symbol = idea?.symbol || idea?.asset || idea?.ticker;

  const { price: current, lastUpdated, isLive, loading, error } = useLivePrice(symbol, {
    // If your Firestore schema differs, map fields here:
    // fields: { symbol: "asset", price: "value", ts: "timestamp" }
  });

  // Debug info
  console.log("IdeaDetail - Symbol:", symbol, "Current price:", current, "Loading:", loading, "Error:", error);

  // Compute PnL only when we have a current price
  const pnl = current
    ? computeIdeaPnL({ idea, fills, current })
    : null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Idea: {idea?.title || idea?.id}</h2>
      <div className="text-sm opacity-70">Side: {idea?.side || idea?.direction}</div>

      <div className="rounded-lg border p-3">
        <div className="font-medium">Live Price</div>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-500">Price error: {error}</div>}
        {!loading && current != null && (
          <div className="flex items-center gap-3">
            <div className="text-2xl tabular-nums">{current.toLocaleString()}</div>
            <div className="text-xs opacity-70">
              {isLive ? "live" : "polling"}
              {lastUpdated ? ` • ${lastUpdated.toLocaleTimeString()}` : ""}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="font-medium">PnL (Mark-to-Market)</div>
        {pnl ? (
          <ul className="text-sm mt-2 space-y-1">
            <li>Net Qty: <span className="tabular-nums">{pnl.netQty}</span></li>
            <li>Avg Entry: <span className="tabular-nums">{pnl.avgEntry?.toFixed(2) ?? "—"}</span></li>
            <li>Realized PnL: <span className="tabular-nums">{pnl.realizedPnl.toFixed(2)}</span></li>
            <li>Open PnL: <span className="tabular-nums">{pnl.mtmPnl.toFixed(2)}</span></li>
            <li>Open PnL %: <span className="tabular-nums">{pnl.mtmPnlPct.toFixed(2)}%</span></li>
            <li>R Multiple: <span className="tabular-nums">{pnl.rMultiple == null ? "—" : pnl.rMultiple.toFixed(2)}</span></li>
          </ul>
        ) : (
          <div className="text-sm opacity-70">Waiting for price…</div>
        )}
      </div>
    </div>
  );
}