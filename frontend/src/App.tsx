import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QueryProvider } from './components/QueryProvider';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { TicketsPage } from './pages/TicketsPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Layout showNav={false}><LoginPage /></Layout>} />
          <Route path="/access-denied" element={<Layout showNav={false}><AccessDeniedPage /></Layout>} />
          <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Layout><TicketsPage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<AdminRoute><Layout><UsersPage /></Layout></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </QueryProvider>
  );
}
