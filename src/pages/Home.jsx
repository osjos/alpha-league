import { useState } from 'react'

export default function Home() {
  const [boom, setBoom] = useState(false)
  if (boom) throw new Error('Intentional crash for testing')

  return (
    <section className="rounded-2xl border border-slate-800 p-6 space-y-3">
      <h1 className="text-xl font-semibold">Home</h1>
      <p className="text-slate-300">Welcome. Use the nav to test client-side routing.</p>
      <button
        className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-medium hover:bg-rose-600"
        onClick={() => setBoom(true)}
        title="Triggers a render-time error to test the ErrorBoundary"
      >
        Trigger error boundary
      </button>
    </section>
  )
}