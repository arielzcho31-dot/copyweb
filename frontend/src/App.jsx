import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Companies from './pages/Companies';
import Budgets from './pages/Budgets';
import Branches from './pages/Branches';
import Books from './pages/Books';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/facturas" element={<PrivateRoute><Layout><Invoices /></Layout></PrivateRoute>} />
      <Route path="/empresas" element={<PrivateRoute><Layout><Companies /></Layout></PrivateRoute>} />
      <Route path="/presupuestos" element={<PrivateRoute><Layout><Budgets /></Layout></PrivateRoute>} />
      <Route path="/sucursales" element={<PrivateRoute adminOnly><Layout><Branches /></Layout></PrivateRoute>} />
      <Route path="/libros" element={<PrivateRoute><Layout><Books /></Layout></PrivateRoute>} />
    </Routes>
  );
}
