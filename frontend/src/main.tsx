import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

function App() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [databaseStatus, setDatabaseStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus(data.status)
        setDatabaseStatus(data.database)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Helpdesk
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">Backend Connection</h2>
          <div className="mt-4 space-y-2">
            {loading && <p className="text-gray-600">Connecting to backend...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            {healthStatus === 'ok' && (
              <>
                <p className="text-green-600">✓ Backend is connected and healthy!</p>
                {databaseStatus === 'connected' && (
                  <p className="text-green-600">✓ Database is connected!</p>
                )}
                {databaseStatus === 'disconnected' && (
                  <p className="text-yellow-600">⚠ Database is not connected. Check your DATABASE_URL.</p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
