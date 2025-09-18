import { useEffect, useState } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  addDoc,
} from "firebase/firestore";
import IdeaCard from "./components/IdeaCard";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Landing() {
  const [topTraders, setTopTraders] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");

  useEffect(() => {
    // live subscription to top 5 by 30d PnL
    const q = query(collection(db, "traders"), orderBy("stats.pnl30d", "desc"), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setTopTraders(rows);
    }, (err) => {
      console.warn("Leaderboard listen failed:", err?.message || err);
    });
    return () => unsub();
  }, []);

  const seedTraders = async () => {
    setSeeding(true);
    setSeedError("");
    try {
      // five example traders with simple stats
      const examples = [
        { id: "t_alfa", name: "Alfa",  wr: 62, pf: 1.8, pnl30d: 12.4, mdd: -4.1 },
        { id: "t_bravo", name: "Bravo", wr: 55, pf: 1.5, pnl30d: 9.9,  mdd: -5.6 },
        { id: "t_charlie", name: "Charlie", wr: 68, pf: 2.1, pnl30d: 18.7, mdd: -6.2 },
        { id: "t_delta", name: "Delta", wr: 59, pf: 1.3, pnl30d: 7.2,  mdd: -3.5 },
        { id: "t_echo", name: "Echo",  wr: 64, pf: 1.9, pnl30d: 14.3, mdd: -4.8 },
      ];
      for (const t of examples) {
        await setDoc(doc(db, "traders", t.id), {
          displayName: t.name,
          stats: {
            wr: t.wr,           // Win Rate %
            pf: t.pf,           // Profit Factor
            pnl30d: t.pnl30d,   // 30d PnL %
            mdd: t.mdd,         // Max Drawdown %
          },
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      setSeedError(e?.message || String(e));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="py-8">
        <h1 className="text-3xl font-bold">Alpha League</h1>
        <p className="text-gray-600 mt-2">
          Find, submit, and track alpha-generating trading ideas.
        </p>
        <div className="mt-4 flex gap-3">
          <a href="/submit" className="border px-4 py-2 rounded-xl hover:bg-gray-50">Submit an Idea</a>
          <a href="/feed" className="border px-4 py-2 rounded-xl hover:bg-gray-50">Explore Feed</a>
        </div>
      </header>

      {/* Leaderboard preview */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Top 5 Leaderboard (preview)</h2>
          <a href="/leaderboard" className="text-sm underline">View all</a>
        </div>

        {/* Seed helper (temporary) */}
        <div className="mt-3">
          {topTraders.length === 0 && (
            <button
              onClick={seedTraders}
              disabled={seeding}
              className="text-sm border px-3 py-1 rounded-xl hover:bg-gray-50"
            >
              {seeding ? "Seeding…" : "Seed sample traders"}
            </button>
          )}
          {seedError && <div className="text-sm text-red-600 mt-1">Seeding failed: {seedError}</div>}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topTraders.length === 0 ? (
            [1,2,3,4,5].map((i) => (
              <div key={i} className="p-4 rounded-2xl border animate-pulse">
                <div className="font-medium">Trader {i}</div>
                <div className="text-sm text-gray-500">WR: — • PF: — • 30d PnL: — • MDD: —</div>
              </div>
            ))
          ) : (
            topTraders.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl border">
                <div className="font-medium">{t.displayName}</div>
                <div className="text-sm text-gray-600">
                  WR: {t.stats?.wr ?? "—"}% • PF: {t.stats?.pf ?? "—"} • 30d PnL: {t.stats?.pnl30d ?? "—"}% • MDD: {t.stats?.mdd ?? "—"}%
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Feed() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedErr, setSeedErr] = useState("");

  // Filters
  const [asset, setAsset] = useState("all");
  const [direction, setDirection] = useState("all");
  const [timeframe, setTimeframe] = useState("all");

  // Subscribe to approved ideas (limit to 50 to avoid heavy reads)
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "ideas"),
      where("status", "==", "approved"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        // sort newest first by createdAt (client-side to avoid composite index for now)
        rows.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setIdeas(rows);
        setLoading(false);
      },
      (err) => {
        console.warn("Feed listen failed:", err?.message || err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Build dropdown options from data
  const assetOptions = ["all", ...Array.from(new Set(ideas.map(i => i.asset))).filter(Boolean)];
  const timeframeOptions = ["all", ...Array.from(new Set(ideas.map(i => i.timeframe))).filter(Boolean)];
  const directionOptions = ["all", "long", "short"];

  // Apply filters client-side
  const filtered = ideas.filter((i) => {
    if (asset !== "all" && i.asset !== asset) return false;
    if (direction !== "all" && i.direction !== direction) return false;
    if (timeframe !== "all" && i.timeframe !== timeframe) return false;
    return true;
  });

  // Temporary: seed a few approved ideas
  const seedIdeas = async () => {
    setSeedBusy(true);
    setSeedErr("");
    try {
      const examples = [
        {
          id: "i_btc_long_4h",
          asset: "BTCUSDT",
          direction: "long",
          timeframe: "4h",
          entry: 60000,
          stop: 58800,
          targets: [61000, 61800, 63000],
          submittedBy: "Alfa",
          status: "approved",
        },
        {
          id: "i_eth_short_1h",
          asset: "ETHUSDT",
          direction: "short",
          timeframe: "1h",
          entry: 2400,
          stop: 2460,
          targets: [2350, 2320],
          submittedBy: "Charlie",
          status: "approved",
        },
        {
          id: "i_sol_long_1d",
          asset: "SOLUSDT",
          direction: "long",
          timeframe: "1d",
          entry: 150,
          stop: 142,
          targets: [158, 165, 175],
          submittedBy: "Echo",
          status: "approved",
        },
      ];

      for (const ex of examples) {
        await setDoc(doc(db, "ideas", ex.id), {
          asset: ex.asset,
          direction: ex.direction,     // "long" | "short"
          timeframe: ex.timeframe,     // e.g. "1h" | "4h" | "1d"
          entry: ex.entry,             // number
          stop: ex.stop,               // number
          targets: ex.targets,         // number[]
          submittedBy: ex.submittedBy, // display name
          status: ex.status,           // "approved" | "pending" | "rejected"
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      setSeedErr(e?.message || String(e));
    } finally {
      setSeedBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Feed</h1>
      <p className="text-gray-600 mt-2">
        Approved ideas with filters (asset, direction, timeframe).
      </p>

      {/* Seed helper, only if no ideas */}
      {ideas.length === 0 && (
        <div className="mt-4">
          <button
            onClick={seedIdeas}
            disabled={seedBusy}
            className="border px-3 py-1 rounded-xl hover:bg-gray-50 text-sm"
          >
            {seedBusy ? "Seeding…" : "Seed sample ideas"}
          </button>
          {seedErr && <div className="text-sm text-red-600 mt-1">{seedErr}</div>}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className="border rounded-xl p-2"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        >
          {assetOptions.map(opt => <option key={opt} value={opt}>Asset: {opt}</option>)}
        </select>

        <select
          className="border rounded-xl p-2"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          {directionOptions.map(opt => <option key={opt} value={opt}>Direction: {opt}</option>)}
        </select>

        <select
          className="border rounded-xl p-2"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          {timeframeOptions.map(opt => <option key={opt} value={opt}>Timeframe: {opt}</option>)}
        </select>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">No ideas match the filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitIdea() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Draft form state
  const [draft, setDraft] = useState({
    asset: "",
    direction: "long",      // "long" | "short"
    timeframe: "4h",        // "1h" | "4h" | "1d" | "1w"
    entry: "",
    stop: "",
    targetsInput: "",       // comma separated, e.g. "61000, 61800, 63000"
    skin: false,
    notes: "",
  });

  // Helpers
  const isSignedIn = !!auth.currentUser;

  const parseNum = (v) => {
    const n = typeof v === "string" ? parseFloat(v.trim().replace(",", ".")) : Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const parseTargets = (s) => {
    if (!s || typeof s !== "string") return [];
    return s.split(",")
      .map(x => parseNum(x))
      .filter(n => Number.isFinite(n));
  };

  // --- Validations ---
  const validateStep1 = () => {
    const errors = [];
    if (!draft.asset || !draft.asset.trim()) errors.push("Asset is required (e.g., BTCUSDT).");
    if (!["long","short"].includes(draft.direction)) errors.push("Direction must be long or short.");
    if (!["1h","4h","1d","1w"].includes(draft.timeframe)) errors.push("Pick a valid timeframe.");
    return errors;
  };

  const validateStep2 = () => {
    const errors = [];
    const entry = parseNum(draft.entry);
    const stop  = parseNum(draft.stop);
    const targets = parseTargets(draft.targetsInput);

    if (!Number.isFinite(entry)) errors.push("Entry must be a number.");
    if (!Number.isFinite(stop))  errors.push("Stop must be a number.");
    if (!targets.length)         errors.push("At least one target is required (comma-separated).");

    if (Number.isFinite(entry) && Number.isFinite(stop)) {
      if (draft.direction === "long" && !(stop < entry)) {
        errors.push("For LONG, Stop must be LESS than Entry.");
      }
      if (draft.direction === "short" && !(stop > entry)) {
        errors.push("For SHORT, Stop must be GREATER than Entry.");
      }
    }

    if (targets.length) {
      if (draft.direction === "long" && targets.some(t => !(t > parseNum(draft.entry)))) {
        errors.push("For LONG, all Targets must be GREATER than Entry.");
      }
      if (draft.direction === "short" && targets.some(t => !(t < parseNum(draft.entry)))) {
        errors.push("For SHORT, all Targets must be LESS than Entry.");
      }
    }
    return errors;
  };

  const validateStep3 = () => {
    const errors = [];
    if (!draft.skin) errors.push("You must confirm you have skin in the game.");
    return errors;
  };

  const next = () => {
    setErr("");
    let errors = [];
    if (step === 1) errors = validateStep1();
    if (step === 2) errors = validateStep2();
    if (step === 3) errors = validateStep3();
    if (errors.length) { setErr(errors.join(" ")); return; }
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    setErr("");
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setErr("");
    setOkMsg("");
    const allErrs = [...validateStep1(), ...validateStep2(), ...validateStep3()];
    if (allErrs.length) { setErr(allErrs.join(" ")); return; }
    if (!isSignedIn) { setErr("Please sign in (top-right) before submitting."); return; }

    const entry = parseNum(draft.entry);
    const stop  = parseNum(draft.stop);
    const targets = parseTargets(draft.targetsInput);

    const payload = {
      asset: (draft.asset || "").toUpperCase().trim(),
      direction: draft.direction,
      timeframe: draft.timeframe,
      entry,
      stop,
      targets,
      notes: draft.notes?.trim() || "",
      status: "pending", // pending -> (manual approve later)
      submittedByUid: auth.currentUser?.uid || null,
      submittedBy: auth.currentUser?.isAnonymous ? "anon" : (auth.currentUser?.displayName || "anon"),
      createdAt: serverTimestamp(),
    };

    try {
      setBusy(true);
      await addDoc(collection(db, "ideas"), payload);
      setOkMsg("✅ Idea submitted! It's now pending approval.");
      // reset the form, keep direction/timeframe for convenience
      setDraft((d) => ({
        ...d,
        asset: "",
        entry: "",
        stop: "",
        targetsInput: "",
        notes: "",
        skin: false,
      }));
      setStep(1);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Submit Idea</h1>
        <p className="text-gray-600 mt-2">Please sign in (top-right) to submit an idea.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Submit Idea</h1>
      <p className="text-gray-600 mt-2">3–4 step wizard with validation & "skin in the game".</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mt-4 text-sm">
        {[1,2,3,4].map(n => (
          <div key={n} className={`px-3 py-1 rounded-full border ${n===step ? "bg-black text-white border-black" : "bg-white"}`}>Step {n}</div>
        ))}
      </div>

      {/* Card */}
      <div className="mt-4 border rounded-2xl p-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Asset (symbol)</label>
              <input
                className="w-full border rounded-xl p-2 mt-1"
                placeholder="e.g., BTCUSDT"
                value={draft.asset}
                onChange={(e) => setDraft({ ...draft, asset: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Direction</label>
              <div className="mt-1 flex gap-3">
                {["long","short"].map(d => (
                  <label key={d} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="direction"
                      checked={draft.direction === d}
                      onChange={() => setDraft({ ...draft, direction: d })}
                    />
                    <span className="capitalize">{d}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Timeframe</label>
              <select
                className="w-full border rounded-xl p-2 mt-1"
                value={draft.timeframe}
                onChange={(e) => setDraft({ ...draft, timeframe: e.target.value })}
              >
                {["1h","4h","1d","1w"].map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Entry (number)</label>
              <input
                className="w-full border rounded-xl p-2 mt-1"
                placeholder="e.g., 60000"
                value={draft.entry}
                onChange={(e) => setDraft({ ...draft, entry: e.target.value })}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stop (number)</label>
              <input
                className="w-full border rounded-xl p-2 mt-1"
                placeholder="e.g., 58800"
                value={draft.stop}
                onChange={(e) => setDraft({ ...draft, stop: e.target.value })}
                inputMode="decimal"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Targets (comma-separated)</label>
              <input
                className="w-full border rounded-xl p-2 mt-1"
                placeholder="e.g., 61000, 61800, 63000"
                value={draft.targetsInput}
                onChange={(e) => setDraft({ ...draft, targetsInput: e.target.value })}
                inputMode="decimal"
              />
              <p className="text-xs text-gray-500 mt-1">
                For LONG: all targets must be &gt; entry. For SHORT: all targets must be &lt; entry.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Optional notes</label>
              <textarea
                className="w-full border rounded-xl p-2 mt-1"
                rows={4}
                placeholder="Setup rationale, invalidation details, etc."
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.skin}
                onChange={(e) => setDraft({ ...draft, skin: e.target.checked })}
              />
              <span className="text-sm">
                I confirm I have taken (or will take immediately) the same position — "skin in the game".
              </span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Asset:</span> {draft.asset || "—"}</div>
            <div><span className="font-medium">Direction:</span> {draft.direction}</div>
            <div><span className="font-medium">Timeframe:</span> {draft.timeframe}</div>
            <div><span className="font-medium">Entry:</span> {draft.entry || "—"}</div>
            <div><span className="font-medium">Stop:</span> {draft.stop || "—"}</div>
            <div><span className="font-medium">Targets:</span> {draft.targetsInput || "—"}</div>
            <div><span className="font-medium">Skin in the game:</span> {draft.skin ? "Yes" : "No"}</div>
            <div><span className="font-medium">Notes:</span> {draft.notes || "—"}</div>
          </div>
        )}
      </div>

      {/* Errors / success */}
      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      {okMsg && <div className="mt-3 text-sm text-green-700">{okMsg}</div>}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={back}
          className="border px-4 py-2 rounded-xl disabled:opacity-50"
          disabled={step === 1 || busy}
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={next}
            className="border px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            disabled={busy}
          >
            Next
          </button>
        ) : (
          <button
            onClick={submit}
            className="border px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Submitting…" : "Submit Idea"}
          </button>
        )}
      </div>
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // sortKey: 'trader' | 'wr' | 'pf' | 'pnl30d' | 'mdd'
  const [sortKey, setSortKey] = useState("pnl30d");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'

  useEffect(() => {
    // Subscribe to up to 100 traders; client-side sort keeps indexes simple for now
    const q = query(collection(db, "traders"), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setRows(out);
        setLoading(false);
      },
      (err) => {
        console.warn("Leaderboard listen failed:", err?.message || err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const arrow = (k) => (sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "");

  const toggleSort = (k) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      // sensible defaults: strings asc, metrics desc
      setSortDir(k === "trader" ? "asc" : "desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === "trader") {
      const as = (a.displayName || "").toString();
      const bs = (b.displayName || "").toString();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    }
    // numeric fields
    const pick = (r) => {
      const s = r.stats || {};
      if (sortKey === "wr") return Number(s.wr);
      if (sortKey === "pf") return Number(s.pf);
      if (sortKey === "pnl30d") return Number(s.pnl30d);
      if (sortKey === "mdd") return Number(s.mdd); // usually negative; "less negative" is better → we'll use 'desc'
      return NaN;
    };
    const av = pick(a);
    const bv = pick(b);
    const aok = Number.isFinite(av);
    const bok = Number.isFinite(bv);
    if (!aok && !bok) return 0;
    if (!aok) return 1; // missing -> bottom
    if (!bok) return -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const fmt0 = (n) => (Number.isFinite(n) ? `${n.toFixed(0)}%` : "—");
  const fmt1 = (n) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : "—");
  const fmtPF = (n) => (Number.isFinite(n) ? n.toFixed(2) : "—");

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <p className="text-gray-600 mt-2">
        Click a column to sort. Default is 30d PnL (desc).
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">
                <button onClick={() => toggleSort("trader")} className="flex items-center gap-1">
                  Trader <span className="text-gray-500">{arrow("trader")}</span>
                </button>
              </th>
              <th className="py-2 pr-4">
                <button onClick={() => toggleSort("wr")} className="flex items-center gap-1">
                  WR <span className="text-gray-500">{arrow("wr")}</span>
                </button>
              </th>
              <th className="py-2 pr-4">
                <button onClick={() => toggleSort("pf")} className="flex items-center gap-1">
                  PF <span className="text-gray-500">{arrow("pf")}</span>
                </button>
              </th>
              <th className="py-2 pr-4">
                <button onClick={() => toggleSort("pnl30d")} className="flex items-center gap-1">
                  30d PnL <span className="text-gray-500">{arrow("pnl30d")}</span>
                </button>
              </th>
              <th className="py-2 pr-4">
                <button onClick={() => toggleSort("mdd")} className="flex items-center gap-1">
                  MDD <span className="text-gray-500">{arrow("mdd")}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4 text-gray-500" colSpan={5}>Loading…</td></tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={5}>
                  No traders found. Go to the Landing page and click "Seed sample traders".
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{t.displayName || "—"}</td>
                  <td className="py-2 pr-4">{fmt0(t.stats?.wr)}</td>
                  <td className="py-2 pr-4">{fmtPF(t.stats?.pf)}</td>
                  <td className="py-2 pr-4">{fmt1(t.stats?.pnl30d)}</td>
                  <td className="py-2 pr-4">{fmt1(t.stats?.mdd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const writeHeartbeat = async () => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "healthchecks", user.uid),
          { ts: serverTimestamp(), source: "web" },
          { merge: true }
        );
        // eslint-disable-next-line no-console
        console.log("✅ Firestore heartbeat written");
      } catch (e) {
        console.warn("⚠️ Firestore write failed (likely rules):", e?.message || e);
      }
    };
    writeHeartbeat();
  }, [user]);

  return (
    <BrowserRouter>
      {/* Top nav */}
      <nav className="w-full border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link to="/" className="font-semibold">Alpha League</Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link to="/feed" className="hover:underline">Feed</Link>
            <Link to="/submit" className="hover:underline">Submit Idea</Link>
            <Link to="/leaderboard" className="hover:underline">Leaderboard</Link>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {authLoading ? (
              <span className="text-gray-500">Auth…</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">
                  Signed in {user.isAnonymous ? "anon" : ""} • {user.uid.slice(0, 6)}…
                </span>
                <button
                  onClick={() => signOut(auth)}
                  className="border px-3 py-1 rounded-xl hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInAnonymously(auth)}
                className="border px-3 py-1 rounded-xl hover:bg-gray-50"
              >
                Sign in anonymously
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/submit" element={<SubmitIdea />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}