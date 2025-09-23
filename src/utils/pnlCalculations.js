/**
 * PnL Calculation Utilities
 * 
 * Pure JavaScript functions for computing trading metrics from fills and idea data.
 * Supports mark-to-market PnL calculation and R multiple computation.
 */

/**
 * Normalizes side strings to consistent format
 * @param {string} side - "LONG", "SHORT", "BUY", "SELL"
 * @returns {string} - "BUY" or "SELL"
 */
function normalizeSide(side) {
  const s = side?.toUpperCase();
  if (s === "LONG" || s === "BUY") return "BUY";
  if (s === "SHORT" || s === "SELL") return "SELL";
  throw new Error(`Invalid side: ${side}`);
}

/**
 * Calculates position metrics from fills array
 * @param {Array} fills - Array of fill objects: { price, qty, side, ts }
 * @returns {Object} - { avgEntry, netQty, totalBuyQty, totalSellQty, totalBuyValue, totalSellValue }
 */
export function calculatePositionFromFills(fills = []) {
  if (!Array.isArray(fills) || fills.length === 0) {
    return {
      avgEntry: null,
      netQty: 0,
      totalBuyQty: 0,
      totalSellQty: 0,
      totalBuyValue: 0,
      totalSellValue: 0
    };
  }

  let totalBuyQty = 0;
  let totalSellQty = 0;
  let totalBuyValue = 0;
  let totalSellValue = 0;

  for (const fill of fills) {
    const { price, qty, side } = fill;
    
    if (typeof price !== 'number' || typeof qty !== 'number' || !side) {
      continue; // Skip invalid fills
    }

    const normalizedSide = normalizeSide(side);
    const value = price * qty;

    if (normalizedSide === "BUY") {
      totalBuyQty += qty;
      totalBuyValue += value;
    } else {
      totalSellQty += qty;
      totalSellValue += value;
    }
  }

  const netQty = totalBuyQty - totalSellQty;
  
  // Calculate average entry based on net position
  let avgEntry = null;
  if (netQty > 0) {
    // Long position - use buy average
    avgEntry = totalBuyQty > 0 ? totalBuyValue / totalBuyQty : null;
  } else if (netQty < 0) {
    // Short position - use sell average
    avgEntry = totalSellQty > 0 ? totalSellValue / totalSellQty : null;
  }

  return {
    avgEntry,
    netQty,
    totalBuyQty,
    totalSellQty,
    totalBuyValue,
    totalSellValue
  };
}

/**
 * Calculates mark-to-market PnL for a position
 * @param {Object} position - Position object from calculatePositionFromFills
 * @param {number} currentPrice - Current market price for mark-to-market
 * @param {Object} idea - Idea object with side and optional entry fallback
 * @returns {Object} - { pnlAbs, pnlPct, isLong, isFlat }
 */
export function calculateMarkToMarketPnL(position, currentPrice, idea = {}) {
  if (typeof currentPrice !== 'number') {
    return { pnlAbs: null, pnlPct: null, isLong: null, isFlat: true };
  }

  const { avgEntry, netQty } = position;
  const isFlat = netQty === 0;
  
  if (isFlat) {
    return { pnlAbs: 0, pnlPct: 0, isLong: null, isFlat: true };
  }

  const isLong = netQty > 0;
  
  // Use avgEntry from fills, fallback to idea.entry if available
  const entryPrice = avgEntry || idea.entry;
  
  if (typeof entryPrice !== 'number') {
    return { pnlAbs: null, pnlPct: null, isLong, isFlat: false };
  }

  let pnlAbs;
  let pnlPct;

  if (isLong) {
    // Long position: PnL = (current - entry) * qty
    pnlAbs = (currentPrice - entryPrice) * Math.abs(netQty);
    pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    // Short position: PnL = (entry - current) * qty
    pnlAbs = (entryPrice - currentPrice) * Math.abs(netQty);
    pnlPct = ((entryPrice - currentPrice) / entryPrice) * 100;
  }

  return { pnlAbs, pnlPct, isLong, isFlat: false };
}

/**
 * Calculates R multiple based on stop-loss and current PnL
 * @param {Object} pnl - PnL object from calculateMarkToMarketPnL
 * @param {Object} idea - Idea object with side and stop
 * @param {Object} position - Position object from calculatePositionFromFills
 * @returns {number|null} - R multiple or null if cannot calculate
 */
export function calculateRMultiple(pnl, idea, position) {
  const { pnlAbs, isLong, isFlat } = pnl;
  const { avgEntry, netQty } = position;
  
  if (isFlat || typeof pnlAbs !== 'number' || typeof idea.stop !== 'number') {
    return null;
  }

  // Use avgEntry from fills, fallback to idea.entry
  const entryPrice = avgEntry || idea.entry;
  
  if (typeof entryPrice !== 'number') {
    return null;
  }

  let riskPerShare;
  
  if (isLong) {
    // Long: risk = entry - stop
    riskPerShare = entryPrice - idea.stop;
  } else {
    // Short: risk = stop - entry
    riskPerShare = idea.stop - entryPrice;
  }

  if (riskPerShare <= 0) {
    return null; // Invalid stop-loss
  }

  const totalRisk = riskPerShare * Math.abs(netQty);
  
  if (totalRisk === 0) {
    return null;
  }

  return pnlAbs / totalRisk;
}

/**
 * Main function to calculate all metrics for an idea
 * @param {Object} idea - Idea object with side, stop, entry, fills
 * @param {number} currentPrice - Current market price
 * @returns {Object} - Complete metrics object
 */
export function calculateIdeaMetrics(idea, currentPrice) {
  const fills = idea.fills || [];
  const position = calculatePositionFromFills(fills);
  const pnl = calculateMarkToMarketPnL(position, currentPrice, idea);
  const rMultiple = calculateRMultiple(pnl, idea, position);

  return {
    // Position data
    avgEntry: position.avgEntry,
    netQty: position.netQty,
    totalBuyQty: position.totalBuyQty,
    totalSellQty: position.totalSellQty,
    totalBuyValue: position.totalBuyValue,
    totalSellValue: position.totalSellValue,
    
    // PnL data
    pnlAbs: pnl.pnlAbs,
    pnlPct: pnl.pnlPct,
    isLong: pnl.isLong,
    isFlat: pnl.isFlat,
    
    // Risk metrics
    rMultiple,
    
    // Market data
    currentPrice,
    entryPrice: position.avgEntry || idea.entry,
    stopPrice: idea.stop
  };
}

/**
 * Utility function to format PnL for display
 * @param {number} pnl - PnL value
 * @param {string} type - "abs" or "pct"
 * @returns {string} - Formatted string with appropriate symbol and color class
 */
export function formatPnL(pnl, type = "abs") {
  if (typeof pnl !== 'number') return "—";
  
  const isPositive = pnl >= 0;
  const sign = isPositive ? "+" : "";
  
  if (type === "pct") {
    return `${sign}${pnl.toFixed(2)}%`;
  } else {
    return `${sign}$${pnl.toFixed(2)}`;
  }
}

/**
 * Utility function to get CSS class for PnL color
 * @param {number} pnl - PnL value
 * @returns {string} - CSS class name
 */
export function getPnLColorClass(pnl) {
  if (typeof pnl !== 'number') return "text-gray-500";
  return pnl >= 0 ? "text-green-600" : "text-red-600";
}