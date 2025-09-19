import { useAuth } from '../contexts/AuthContext.jsx'

export default function Settings() {
  const { user, initializing, error, signInAnon, signInGoogle, signOut } = useAuth()

  return (
    <section className="rounded-2xl border border-slate-800 p-6 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="text-sm">
        <div className="text-slate-400">Auth status:</div>
        {initializing ? (
          <div className="text-slate-300">Loading…</div>
        ) : user ? (
          <div className="text-slate-300">
            Signed in as <code className="text-slate-200">{user.uid}</code>
            {user.isAnonymous && <span className="ml-2 text-xs text-amber-300">(anonymous)</span>}
            {user.email && <span className="ml-2">{user.email}</span>}
          </div>
        ) : (
          <div className="text-slate-300">Not signed in</div>
        )}
        {error && <div className="text-red-400 mt-2">Error: {String(error.message || error)}</div>}
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
          onClick={signInAnon}
        >
          Sign in anonymously
        </button>
        <button
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
          onClick={signInGoogle}
          title="Enable Google provider + add your current replit.dev domain in Firebase Auth → Authorized domains"
        >
          Sign in with Google
        </button>
        <button
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Tip: For Google sign-in, enable the provider and add this app's current <code>*.replit.dev</code> host
        under <em>Authentication → Settings → Authorized domains</em>. The hostname can change when the repl restarts.
      </p>
    </section>
  )
}