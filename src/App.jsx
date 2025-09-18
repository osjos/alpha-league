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
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Submit Idea</h1>
      <p className="text-gray-600 mt-2">
        3–4 step wizard with validation & "skin in the game" checkbox (coming next).
      </p>
      <div className="mt-6 border rounded-2xl p-4">Form wizard placeholder</div>
    </div>
  );
}

function Leaderboard() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <p className="text-gray-600 mt-2">Sortable columns: Trader, WR, PF, 30d PnL, MDD (coming next).</p>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Trader</th>
              <th className="py-2 pr-4">WR</th>
              <th className="py-2 pr-4">PF</th>
              <th className="py-2 pr-4">30d PnL</th>
              <th className="py-2 pr-4">MDD</th>
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map((i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-4 font-medium">Trader {i}</td>
                <td className="py-2 pr-4">--%</td>
                <td className="py-2 pr-4">--</td>
                <td className="py-2 pr-4">--</td>
                <td className="py-2 pr-4">--</td>
              </tr>
            ))}
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