import { useEffect, useMemo, useState } from "react";
import { app } from "../lib/firebase";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { sideToSign } from "../lib/pnl";

/**
 * useIdeaEvents
 * Combines:
 *  - explicit events from Firestore (collection "events", filtered by ideaId)
 *  - fill events from Firestore (collection "fills", filtered by ideaId)
 *  - derived (computed) events for live target/stop hits based on current price
 *
 * @param {object} params
 *  - ideaId: string
 *  - idea:   idea document (to read side, entry, t1/t2/stop/sl, submittedAt/approvedAt)
 *  - current: number (live price)
 *  - priceTs: Date|null (timestamp of the latest live price tick)
 *
 * Returns: { events, loading }
 *  - events: [{ id, type, ts: Date, label, source: 'db'|'fills'|'computed'|'idea-meta', meta }]
 */
export function useIdeaEvents({ ideaId, idea, current, priceTs }) {
  const db = useMemo(() => getFirestore(app), []);
  const [dbEvents, setDbEvents] = useState([]);
  const [fillEvents, setFillEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1) Subscribe to explicit events (optional collection)
  useEffect(() => {
    if (!ideaId) return;
    const ref = collection(db, "events");
    const qy = query(ref, where("ideaId", "==", ideaId), orderBy("ts", "asc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() || {};
          const ts = data.ts?.toDate?.() || null;
          return {
            id: `evt_${d.id}`,
            type: String(data.type || "EVENT").toUpperCase(),
            ts,
            source: "db",
            label: labelForDbEvent(data),
            meta: data.meta || {},
          };
        });
        setDbEvents(rows);
      },
      () => setDbEvents([]) // if missing, treat as none
    );
    return () => unsub();
  }, [db, ideaId]);

  // 2) Subscribe to fills as timeline items
  useEffect(() => {
    if (!ideaId) return;
    const ref = collection(db, "fills");
    const qy = query(ref, where("ideaId", "==", ideaId), orderBy("ts", "asc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const f = d.data() || {};
          const ts = f.ts?.toDate?.() || null;
          const side = String(f.side || "").toUpperCase();
          const qty = Number(f.qty || 0);
          const price = Number(f.price || 0);
          const txt = side === "SELL" || side === "SHORT" ? "Sell" : "Buy";
          return {
            id: `fill_${d.id}`,
            type: "FILL",
            ts,
            source: "fills",
            label: `${txt} ${qty} @ ${fmtNum(price)}`,
            meta: { ...f },
          };
        });
        setFillEvents(rows);
        setLoading(false);
      },
      () => {
        setFillEvents([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db, ideaId]);

  // 3) Pull status timestamps from the idea doc (fallback if you don't store separate events)
  const ideaMetaEvents = [];
  const submittedAt =
    idea?.submittedAt?.toDate?.() ||
    idea?.createdAt?.toDate?.() ||
    null;
  if (submittedAt) {
    ideaMetaEvents.push({
      id: "idea_submitted",
      type: "SUBMITTED",
      ts: submittedAt,
      source: "idea-meta",
      label: "Idea submitted",
      meta: {},
    });
  }
  const approvedAt = idea?.approvedAt?.toDate?.() || null;
  if (approvedAt) {
    ideaMetaEvents.push({
      id: "idea_approved",
      type: "APPROVED",
      ts: approvedAt,
      source: "idea-meta",
      label: "Idea approved",
      meta: {},
    });
  }

  // 4) Derived live-events: T1/T2/SL based on current price
  const computed = derivePriceEvents(idea, current, priceTs);

  // 5) Merge + sort
  const events = [...ideaMetaEvents, ...dbEvents, ...fillEvents, ...computed]
    .filter((e) => e.ts instanceof Date && !isNaN(e.ts))
    .sort((a, b) => a.ts - b.ts);

  return { events, loading };
}

/* ---------- helpers ---------- */

function labelForDbEvent(e) {
  const t = String(e.type || "").toUpperCase();
  if (t === "SUBMITTED") return "Idea submitted";
  if (t === "APPROVED") return "Idea approved";
  if (t === "TARGET_HIT") return `Target hit${e?.meta?.which ? ` (${e.meta.which})` : ""}`;
  if (t === "STOP_HIT") return "Stop hit";
  return t;
}

function fmtNum(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function derivePriceEvents(idea, current, priceTs) {
  if (!idea || !current || !priceTs) return [];
  const side = idea?.side;
  const sign = sideToSign(side);
  const entry = numOrNull(idea?.entry);
  const stop = numOrNull(idea?.stop ?? idea?.sl);
  const t1 = numOrNull(idea?.t1 ?? idea?.tp1 ?? idea?.takeProfit1);
  const t2 = numOrNull(idea?.t2 ?? idea?.tp2 ?? idea?.takeProfit2);

  const out = [];

  // T1 hit?
  if (isTargetHit({ sign, current, target: t1, entry })) {
    out.push({
      id: "computed_t1",
      type: "TARGET_HIT",
      ts: priceTs,
      source: "computed",
      label: "🎯 T1 reached (live)",
      meta: { which: "T1", price: current },
    });
  }
  // T2 hit?
  if (isTargetHit({ sign, current, target: t2, entry })) {
    out.push({
      id: "computed_t2",
      type: "TARGET_HIT",
      ts: priceTs,
      source: "computed",
      label: "🎯 T2 reached (live)",
      meta: { which: "T2", price: current },
    });
  }
  // Stop hit?
  if (isStopHit({ sign, current, stop, entry })) {
    out.push({
      id: "computed_sl",
      type: "STOP_HIT",
      ts: priceTs,
      source: "computed",
      label: "⛔ Stop hit (live)",
      meta: { price: current },
    });
  }
  return out;
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isTargetHit({ sign, current, target, entry }) {
  if (!target || !entry || !current || !sign) return false;
  if (sign > 0) {
    if (!(target > entry)) return false;
    return current >= target;
  } else {
    if (!(target < entry)) return false;
    return current <= target;
  }
}

function isStopHit({ sign, current, stop, entry }) {
  if (!stop || !entry || !current || !sign) return false;
  if (sign > 0) {
    if (!(stop < entry)) return false;
    return current <= stop;
  } else {
    if (!(stop > entry)) return false;
    return current >= stop;
  }
}