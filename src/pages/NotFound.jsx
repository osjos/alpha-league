import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <section className="rounded-2xl border border-red-800 p-6">
      <h1 className="text-xl font-semibold mb-2 text-red-300">404 — Not Found</h1>
      <p className="text-slate-300 mb-4">That page doesn't exist.</p>
      <Link to="/" className="underline">Go home</Link>
    </section>
  )
}