// src/components/IdeaCard.jsx
export default function IdeaCard({ idea }) {
  const {
    asset = "—",
    direction = "—",
    timeframe = "—",
    entry = null,
    stop = null,
    targets = [],
    submittedBy = "—",
    createdAt,
  } = idea || {};

  const created =
    createdAt?.toDate?.() ?
      createdAt.toDate().toLocaleString() :
      "—";

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">{asset} • {direction?.toUpperCase?.()}</div>
        <div className="text-xs text-gray-500">{timeframe}</div>
      </div>

      <div className="text-sm text-gray-600 mt-1">
        By {submittedBy} • {created}
      </div>

      <div className="text-sm mt-3">
        <div>Entry: {entry ?? "—"}</div>
        <div>Stop: {stop ?? "—"}</div>
        <div>Targets: {Array.isArray(targets) && targets.length ? targets.join(", ") : "—"}</div>
      </div>
    </div>
  );
}