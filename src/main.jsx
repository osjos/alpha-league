import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import RootLayout from './layouts/RootLayout.jsx'
import Home from './pages/Home.jsx'
import Ideas from './pages/Ideas.jsx'
import Traders from './pages/Traders.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteError from './pages/RouteError.jsx'

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      {
        path: '/ideas',
        element: <Ideas />,
        loader: async () => {
          // TEMP: force a route error so you can see RouteError.jsx render
          throw new Response('Intentional route error', {
            status: 500,
            statusText: 'Route failed',
          })
        },
      },
      { path: '/traders', element: <Traders /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
