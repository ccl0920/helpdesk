import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { AdminRoute } from './components/AdminRoute';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/login" element={<Layout showNav={false}><LoginPage /></Layout>} />
        <Route path="/access-denied" element={<Layout showNav={false}><AccessDeniedPage /></Layout>} />
        <Route path="/users" element={<AdminRoute><Layout><UsersPage /></Layout></AdminRoute>} />
      </Routes>
    </AuthProvider>
  );
}
