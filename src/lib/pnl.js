/**
 * Normalizes side into +1 for LONG/BUY and -1 for SHORT/SELL.
 */
export function sideToSign(side) {
  if (!side) return 1;
  const s = String(side).toUpperCase();
  if (s === "LONG" || s === "BUY") return 1;
  if (s === "SHORT" || s === "SELL") return -1;
  return 1; // default to long if unknown
}

/**
 * Aggregate fills into net position and average entry price.
 * Supports mixed BUY/SELL fills (netting).
 *
 * Returns:
 * {
 *   netQty,                 // signed (long positive, short negative)
 *   grossQty,               // sum of absolute quantities
 *   avgEntry,               // VWAP of open position; null if flat
 *   realizedPnl,            // realized PnL from closed portions (basic netting)
 * }
 *
 * Notes:
 * - If all fills net to zero, avgEntry = null.
 * - For simplicity, fees are ignored. Add fee handling if needed.
 */
export function aggregateFills(fills) {
  if (!Array.isArray(fills) || fills.length === 0) {
    return { netQty: 0, grossQty: 0, avgEntry: null, realizedPnl: 0 };
  }

  // Build a running position to get VWAP of the OPEN remainder.
  let positionQty = 0; // signed
  let positionCost = 0; // signed: sum(qty * price) with sign
  let realizedPnl = 0;
  let grossQty = 0;

  for (const f of fills) {
    const q = Number(f.qty || 0);
    const p = Number(f.price || 0);
    if (!q || !p) continue;

    const s = sideToSign(f.side);
    const signedQ = s * q;
    grossQty += Math.abs(q);

    // If adding in the same direction → increase position
    if (positionQty === 0 || Math.sign(positionQty) === Math.sign(signedQ)) {
      positionQty += signedQ;
      positionCost += signedQ * p;
    } else {
      // Opposite direction → reducing/closing position
      const closeQty = Math.min(Math.abs(positionQty), Math.abs(signedQ)) * Math.sign(signedQ);
      const remainingQty = signedQ - closeQty;

      // Average price of current position
      const avg = positionQty !== 0 ? positionCost / positionQty : 0;

      // Realized PnL from the closed portion:
      // For a long (positionQty>0), closing with a SELL (signedQ<0): pnl = (p - avg) * |close|
      // For a short (positionQty<0), closing with a BUY (signedQ>0): pnl = (avg - p) * |close|
      if (closeQty !== 0) {
        const closedAbs = Math.abs(closeQty);
        const signWasLong = positionQty > 0;
        const pnl = signWasLong ? (p - avg) * closedAbs : (avg - p) * closedAbs;
        realizedPnl += pnl;

        // Reduce current position
        positionQty += closeQty; // closeQty has sign of incoming order
        positionCost = avg * positionQty; // maintain cost at the avg for remainder
      }

      // If there is overshoot (flip) → open new position in opposite direction
      if (remainingQty !== 0) {
        positionQty += remainingQty;
        positionCost += remainingQty * p;
      }
    }
  }

  const avgEntry = positionQty !== 0 ? positionCost / positionQty : null;
  return { netQty: positionQty, grossQty, avgEntry, realizedPnl };
}

/**
 * Compute mark-to-market PnL for the OPEN position.
 *
 * @param {number} current - current market price
 * @param {number|null} avgEntry - average entry price of open position
 * @param {number} netQty - signed net quantity (long +, short -)
 *
 * Returns: { mtmPnl, mtmPnlPct }
 *  - mtmPnl: absolute PnL value for the open position
 *  - mtmPnlPct: percentage vs average entry (long/short aware)
 */
export function computeMtm(current, avgEntry, netQty) {
  if (!current || !avgEntry || !netQty) {
    return { mtmPnl: 0, mtmPnlPct: 0 };
  }
  const long = netQty > 0;
  const absQty = Math.abs(netQty);

  // Absolute PnL on open position
  const mtmPnl = long
    ? (current - avgEntry) * absQty
    : (avgEntry - current) * absQty;

  // Percentage relative to entry (long/short aware)
  const mtmPnlPct = long
    ? ((current / avgEntry) - 1) * 100
    : ((avgEntry / current) - 1) * 100;

  return { mtmPnl, mtmPnlPct };
}

/**
 * Compute R multiple for the CURRENT price.
 *
 * R = (current - entry) / (entry - stop)   for LONG
 * R = (entry - current) / (stop - entry)   for SHORT
 *
 * Returns null if missing entry/stop or if denominator is 0.
 */
export function computeRMultiple(current, entry, stop, side) {
  if (!current || !entry || !stop) return null;

  const s = sideToSign(side);
  if (s === 1) {
    const denom = entry - stop;
    if (!denom) return null;
    return (current - entry) / denom;
  } else {
    const denom = stop - entry;
    if (!denom) return null;
    return (entry - current) / denom;
  }
}

/**
 * High-level helper that takes idea + fills + current price
 * and returns ready-to-render metrics.
 *
 * @param {object} params
 *  - idea: { side, stop, entry? }
 *  - fills: array
 *  - current: number
 *
 * Returns:
 * {
 *   netQty, avgEntry, realizedPnl,
 *   mtmPnl, mtmPnlPct,
 *   rMultiple, // null if stop/entry missing
 * }
 */
export function computeIdeaPnL({ idea, fills, current }) {
  const { netQty, avgEntry, realizedPnl } = aggregateFills(fills || []);

  // entry to use for R: prefer avgEntry if we have an open position,
  // else fall back to idea.entry (if provided)
  const entryForR = avgEntry || (idea && Number(idea.entry)) || null;

  const { mtmPnl, mtmPnlPct } = computeMtm(current, avgEntry, netQty);

  const rMultiple = computeRMultiple(
    current,
    entryForR,
    idea && Number(idea.stop),
    idea && idea.side
  );

  return {
    netQty,
    avgEntry,
    realizedPnl,
    mtmPnl,
    mtmPnlPct,
    rMultiple,
  };
}