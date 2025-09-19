import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'

export default function RouteError() {
  const err = useRouteError()
  let title = 'Unexpected error'
  let message = ''
  let status = ''

  if (isRouteErrorResponse(err)) {
    status = err.status
    title = err.statusText || title
    message = (err.data && (err.data.message || err.data)) || ''
  } else if (err instanceof Error) {
    message = err.message
  } else if (err) {
    message = String(err)
  }

  return (
    <section className="rounded-2xl border border-red-800 p-6">
      <h1 className="text-xl font-semibold text-red-300 mb-2">
        {title} {status ? `(${status})` : ''}
      </h1>
      {message && <p className="text-slate-300 mb-4">{message}</p>}
      <Link to="/" className="underline">Go home</Link>
    </section>
  )
}