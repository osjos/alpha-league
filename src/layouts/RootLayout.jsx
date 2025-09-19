import { NavLink, Outlet } from "react-router-dom"

const linkBase =
  "px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800/60 transition"
const linkActive = "bg-slate-800 text-white"
const linkIdle = "text-slate-300"

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-4">
          <div className="text-xl font-semibold">Alpha League</div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Home</NavLink>
            <NavLink to="/ideas" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Ideas</NavLink>
            <NavLink to="/traders" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Traders</NavLink>
            <NavLink to="/settings" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>Settings</NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-slate-400">
          © {new Date().getFullYear()} Alpha League · SPA routing demo
        </div>
      </footer>
    </div>
  )
}