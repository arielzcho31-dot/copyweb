import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Building2, FileText, Store, LogOut, Menu, X, Shield, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/facturas', label: 'Facturas', icon: Receipt },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { to: '/libros', label: 'Libros', icon: BookOpen },
];

const adminLinks = [
  { to: '/sucursales', label: 'Sucursales', icon: Store },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const isAdmin = user?.rol === 'admin';

  return (
    <>
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-brand-500 to-green-500 text-white rounded-lg shadow" onClick={() => setOpen(!open)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-brand-600 via-brand-700 to-green-800 text-white transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold">C</div>
            <div>
              <h1 className="text-xl font-bold">Copycenter</h1>
              <p className="text-xs text-white/70">Sistema de Facturación</p>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-1">{user?.nombre}</p>
          {user?.rol && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/20 mt-1">
              {user.rol === 'admin' ? <Shield size={10} /> : <Store size={10} />}
              {user.rol === 'admin' ? 'Admin' : 'Sucursal'}
            </span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <l.icon size={20} />
              {l.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="border-t border-white/10 my-2" />
              <p className="text-xs text-white/40 px-4 pb-1 uppercase tracking-wider">Administración</p>
              {adminLinks.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <l.icon size={20} />
                  {l.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
