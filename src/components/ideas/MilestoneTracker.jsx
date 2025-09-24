import React from "react";
import { computeIdeaPnL, computeRMultiple, sideToSign } from "../../lib/pnl";

/**
 * MilestoneTracker
 * - Shows progress from Entry → T1/T2 (long/short aware)
 * - Shows remaining distance and current R vs target R
 * - Shows "risk buffer" to Stop (how much room until SL)
 *
 * Props:
 *  - idea: { side, entry?, stop? or sl?, t1? or tp1?, t2? or tp2? }
 *  - fills: [{ side, qty, price, ts }, ...]
 *  - current: number (current market price)
 *
 * Field name flexibility:
 *  - stop: uses idea.stop || idea.sl
 *  - t1:   uses idea.t1 || idea.tp1 || idea.takeProfit1
 *  - t2:   uses idea.t2 || idea.tp2 || idea.takeProfit2
 */
export default function MilestoneTracker({ idea, fills, current }) {
  const side = idea?.side;
  const sign = sideToSign(side);
  const stop = numOrNull(idea?.stop ?? idea?.sl);
  const t1 = numOrNull(idea?.t1 ?? idea?.tp1 ?? idea?.takeProfit1);
  const t2 = numOrNull(idea?.t2 ?? idea?.tp2 ?? idea?.takeProfit2);

  // Compute PnL stats to get avgEntry if there's an open position
  const pnl = computeIdeaPnL({ idea, fills, current });
  // Prefer avgEntry for progress if we have an open position; else fallback to idea.entry
  const entry = pnl?.avgEntry ?? numOrNull(idea?.entry);

  if (!entry || !current) {
    return (
      <div className="rounded-lg border p-3">
        <div className="font-medium">Milestones</div>
        <div className="text-sm opacity-70 mt-2">
          Need an <span className="font-medium">entry</span> (from fills or idea.entry) and a live <span className="font-medium">price</span> to show progress.
        </div>
      </div>
    );
  }

  // Build cards dynamically based on which targets exist
  const targets = [
    { label: "T1", price: t1 },
    { label: "T2", price: t2 },
  ].filter(t => typeof t.price === "number" && !Number.isNaN(t.price));

  const rNow = (stop ? computeRMultiple(current, entry, stop, side) : null);

  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium">Milestones</div>

      {/* Risk buffer to SL */}
      {stop ? (
        <div className="mt-3">
          <RowHeader
            title="Risk Buffer to SL"
            right={fmtPriceDiff(stop, current, sign < 0)} // show signed properly
          />
          <ProgressBar {...riskBufferToSL(entry, stop, current, sign)} />
          <div className="text-xs opacity-70 mt-1">
            Stop: <b className="tabular-nums">{stop}</b> • Entry: <b className="tabular-nums">{round2(entry)}</b> • R now: <b>{fmtR(rNow)}</b>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm opacity-70">Add a Stop to enable risk/R tracking.</div>
      )}

      {/* T1 / T2 */}
      {targets.length > 0 ? (
        <div className="mt-4 space-y-4">
          {targets.map(t => {
            const prog = progressToTarget(entry, t.price, current, sign);
            const rTarget = stop ? computeRMultiple(t.price, entry, stop, side) : null;
            return (
              <div key={t.label}>
                <RowHeader
                  title={`${t.label} • ${t.price}`}
                  right={`R target: ${fmtR(rTarget)}  •  R now: ${fmtR(rNow)}`}
                />
                <ProgressBar {...prog} />
                <div className="text-xs opacity-70 mt-1">
                  {prog.invalid ? (
                    <span>Invalid target for side <b>{side}</b> (check entry/target relation).</span>
                  ) : (
                    <span>
                      Remaining to {t.label}: <b className="tabular-nums">{round2(prog.remainingAbs)}</b>{" "}
                      ({round2(prog.remainingPct)}%)
                      {prog.crossed ? " • Target hit ✅" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 text-sm opacity-70">Add T1/T2 to see progress bars.</div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number(n.toFixed(2));
}

function fmtR(r) {
  if (r == null || !Number.isFinite(r)) return "—";
  return `${round2(r)}R`;
}

// Render a compact row title + right-aligned meta
function RowHeader({ title, right }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="font-medium">{title}</div>
      <div className="text-xs opacity-70">{right}</div>
    </div>
  );
}

// Simple progress bar with clamped 0..100% width; invalid shows muted bar
function ProgressBar({ pct = 0, crossed = false, invalid = false }) {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  const base = "w-full h-2 rounded-full";
  const track = invalid ? "bg-gray-200/60" : "bg-gray-200";
  const fill = invalid ? "bg-gray-300" : crossed ? "bg-emerald-500" : "bg-blue-500";

  return (
    <div className={`${base} ${track} mt-1 overflow-hidden`}>
      <div className={`${base} ${fill}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/**
 * Progress from Entry → Target (long/short aware)
 * - pct: 0..100
 * - remainingAbs: absolute price distance to target (>=0)
 * - remainingPct: percentage of the full target move still remaining
 * - crossed: true if target reached or exceeded
 * - invalid: true if target is on the wrong side (e.g., T1 below entry for LONG)
 */
function progressToTarget(entry, target, current, sign) {
  if (!entry || !target || !current || !sign) return { pct: 0, invalid: true };

  // For LONG: denom = target - entry (must be >0)
  // For SHORT: denom = entry - target (must be >0)
  const denom = sign > 0 ? (target - entry) : (entry - target);
  if (!(denom > 0)) return { pct: 0, invalid: true };

  // For LONG: num = current - entry
  // For SHORT: num = entry - current
  const num = sign > 0 ? (current - entry) : (entry - current);

  const raw = num / denom;
  const crossed = raw >= 1;
  const pct = Math.max(0, Math.min(raw, 1)) * 100;

  const remainingAbs = Math.max(0, sign > 0 ? (target - current) : (current - target));
  const remainingPct = Math.max(0, (remainingAbs / denom) * 100);

  return { pct, remainingAbs, remainingPct, crossed, invalid: false };
}

/**
 * Risk buffer to SL (visualize distance from Stop)
 * We show how much "room" is left between current and stop vs total risk (entry↔stop).
 * - pct: 0..100 where 100% means at entry or better; shrinks as price approaches SL.
 */
function riskBufferToSL(entry, stop, current, sign) {
  if (!entry || !stop || !current || !sign) return { pct: 0, invalid: true };

  // total risk range (must be >0):
  // LONG: entry - stop
  // SHORT: stop - entry
  const denom = sign > 0 ? (entry - stop) : (stop - entry);
  if (!(denom > 0)) return { pct: 0, invalid: true };

  // remaining buffer to stop:
  // LONG: current - stop
  // SHORT: stop - current
  const num = sign > 0 ? (current - stop) : (stop - current);

  // At entry → pct = 100; at stop → pct = 0; above entry for LONG (or below for SHORT) clamps at 100
  const raw = num / denom;
  const pct = Math.max(0, Math.min(raw, 1)) * 100;

  // For the small right-hand label on the row:
  return { pct, crossed: pct === 0, invalid: false };
}

/** Format a small label for price difference to SL (direction aware) */
function fmtPriceDiff(stop, current, isShort) {
  if (!stop || !current) return "";
  const diff = isShort ? (current - stop) : (stop - current); // show approach sign
  const sign = diff > 0 ? "-" : diff < 0 ? "+" : "";
  return `Δ to SL: ${sign}${round2(Math.abs(stop - current))}`;
}