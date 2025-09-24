import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "../lib/firebase"; // <-- your existing path

/**
 * useLivePrice
 * Subscribes to Firestore for the newest price for a given symbol.
 * Falls back to polling if snapshots fail/unavailable.
 *
 * @param {string} symbol - e.g. "BTC-USD"
 * @param {object} options
 *   - pollMs        number (default 8000)
 *   - collection    string (default "prices")
 *   - fields        { symbol, price, ts } mapping to your Firestore fields
 *                   defaults: { symbol: "symbol", price: "price", ts: "ts" }
 */
export function useLivePrice(symbol, options = {}) {
  const pollMs = options.pollMs ?? 8000;
  const collectionName = options.collection ?? "prices";
  const fields = {
    symbol: options.fields?.symbol ?? "symbol",
    price: options.fields?.price ?? "price",
    ts: options.fields?.ts ?? "ts",
  };

  const db = useMemo(() => getFirestore(app), []);
  const [price, setPrice] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(!!symbol);
  const [error, setError] = useState(null);

  const pollTimer = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    // cleanup previous
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    setLoading(true);
    setError(null);
    setIsLive(false);

    const pricesRef = collection(db, collectionName);
    const q = query(
      pricesRef,
      where(fields.symbol, "==", symbol),
      orderBy(fields.ts, "desc"),
      limit(1)
    );

    // try realtime
    let snapshotStarted = false;
    try {
      const unsub = onSnapshot(
        q,
        (snap) => {
          snapshotStarted = true;
          setIsLive(true);
          setLoading(false);
          if (!snap.empty) {
            const d = snap.docs[0].data();
            const p = d?.[fields.price];
            const t = d?.[fields.ts];
            if (typeof p === "number") setPrice(p);
            if (t?.toDate) setLastUpdated(t.toDate());
          }
        },
        () => {
          // fallback to polling
          setIsLive(false);
          startPolling(q);
        }
      );
      unsubRef.current = unsub;
    } catch {
      // if onSnapshot throws immediately
      if (!snapshotStarted) {
        setIsLive(false);
        startPolling(q);
      }
    }

    function startPolling(qry) {
      const fetchOnce = async () => {
        try {
          const snap = await getDocs(qry);
          setLoading(false);
          if (!snap.empty) {
            const d = snap.docs[0].data();
            const p = d?.[fields.price];
            const t = d?.[fields.ts];
            if (typeof p === "number") setPrice(p);
            if (t?.toDate) setLastUpdated(t.toDate());
          }
        } catch (e) {
          setError(e?.message ?? "Polling failed");
        }
      };
      fetchOnce();
      pollTimer.current = setInterval(fetchOnce, pollMs);
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [db, symbol, pollMs, collectionName, fields.symbol, fields.price, fields.ts]);

  return { price, lastUpdated, isLive, loading, error };
}