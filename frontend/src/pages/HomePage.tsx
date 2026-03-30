import { useAuth } from '../hooks/useAuth';
import { NavBar } from '../components/NavBar';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function HomePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome to Helpdesk
            </h2>
            <p className="mt-2 text-gray-600">
              You are signed in as <span className="font-medium text-gray-900">{user?.email}</span>
            </p>
            <div className="mt-6">
              <p className="text-gray-600">
                This is your dashboard. Ticket management features coming soon.
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
