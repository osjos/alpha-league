import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import IdeaDetail from "../components/IdeaDetail";

export default function IdeaDetailPage() {
  const { id } = useParams();
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Test fills array as suggested in the requirements
  const testFills = [
    { side: "BUY",  qty: 1,   price: 50000 },
    { side: "BUY",  qty: 0.5, price: 52000 },
    { side: "SELL", qty: 0.3, price: 54000 },
  ];

  useEffect(() => {
    if (!id) return;

    const fetchIdea = async () => {
      try {
        setLoading(true);
        const ideaDoc = await getDoc(doc(db, "ideas", id));
        
        if (ideaDoc.exists()) {
          setIdea({ id: ideaDoc.id, ...ideaDoc.data() });
        } else {
          setError("Idea not found");
        }
      } catch (err) {
        setError(err?.message || "Failed to load idea");
      } finally {
        setLoading(false);
      }
    };

    fetchIdea();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <Link to="/feed" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Idea not found</h2>
          <Link to="/feed" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with back link */}
      <div className="mb-6">
        <Link to="/feed" className="text-blue-600 hover:underline text-sm">
          ← Back to Feed
        </Link>
      </div>

      {/* Basic idea info */}
      <div className="mb-6 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="font-medium text-lg">{idea.asset} • {idea.direction?.toUpperCase()}</div>
          <div className="text-sm text-gray-500">{idea.timeframe}</div>
        </div>
        
        <div className="text-sm text-gray-600 mt-2">
          By {idea.submittedBy} • {idea.createdAt?.toDate?.()?.toLocaleString() || "—"}
        </div>
        
        <div className="text-sm mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>Entry: {idea.entry ?? "—"}</div>
          <div>Stop: {idea.stop ?? "—"}</div>
          <div>Targets: {Array.isArray(idea.targets) && idea.targets.length ? idea.targets.join(", ") : "—"}</div>
        </div>
      </div>

      {/* PnL Detail Component */}
      <IdeaDetail 
        idea={{
          ...idea,
          side: idea.direction // Map direction to side for PnL calculations
        }} 
        fills={testFills} 
      />
    </div>
  );
}