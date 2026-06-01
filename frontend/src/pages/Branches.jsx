import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Store, UserPlus, Users, ClipboardList } from 'lucide-react';
import { branches, auth, audit } from '../services/api';
import toast from 'react-hot-toast';

export default function Branches() {
  const [tab, setTab] = useState('sucursales');
  const [lista, setLista] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' });
  const [userForm, setUserForm] = useState({ nombre: '', email: '', password: '', rol: 'sucursal', sucursal_id: '' });

  useEffect(() => { load(); loadUsers(); loadLogs(); }, []);

  const load = async () => { setLista(await branches.list()); };
  const loadUsers = async () => { try { setUsers(await auth.listUsers()); } catch {} };
  const loadLogs = async () => { try { const data = await audit.list(); setLogs(data.rows || data); } catch {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await branches.update(editing, form); toast.success('Sucursal actualizada'); }
      else { await branches.create(form); toast.success('Sucursal creada'); }
      setShowForm(false); setEditing(null); resetForm(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEdit = (s) => {
    setForm({ nombre: s.nombre, direccion: s.direccion || '', telefono: s.telefono || '' });
    setEditing(s.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar sucursal?')) return;
    try { await branches.delete(id); toast.success('Sucursal eliminada'); load(); }
    catch (err) { toast.error('Error al eliminar'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await auth.updateUser(editingUser, { nombre: userForm.nombre, email: userForm.email, rol: userForm.rol, sucursal_id: userForm.sucursal_id });
        toast.success('Usuario actualizado');
      } else {
        await auth.createUser(userForm);
        toast.success('Usuario creado');
      }
      setShowUserForm(false); setEditingUser(null);
      setUserForm({ nombre: '', email: '', password: '', rol: 'sucursal', sucursal_id: '' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEditUser = (u) => {
    setUserForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, sucursal_id: u.sucursal_id || '' });
    setEditingUser(u.id);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return;
    try { await auth.deleteUser(id); toast.success('Usuario eliminado'); loadUsers(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const resetForm = () => setForm({ nombre: '', direccion: '', telefono: '' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Administración</h1>
        <div className="flex gap-2">
          <button onClick={() => { setEditingUser(null); setUserForm({ nombre: '', email: '', password: '', rol: 'sucursal', sucursal_id: '' }); setShowUserForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <UserPlus size={16} /> Nuevo Usuario
          </button>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
            <Plus size={16} /> Nueva Sucursal
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input type="text" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-brand-500 text-white py-2 rounded-lg hover:bg-brand-600">{editing ? 'Actualizar' : 'Crear'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={userForm.nombre} onChange={e => setUserForm({...userForm, nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
              {!editingUser && <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label><input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={userForm.rol} onChange={e => setUserForm({...userForm, rol: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="sucursal">Sucursal</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sucursal (opcional)</label>
                <select value={userForm.sucursal_id} onChange={e => setUserForm({...userForm, sucursal_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Sin sucursal</option>
                  {lista.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">{editingUser ? 'Actualizar' : 'Crear Usuario'}</button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('sucursales')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'sucursales' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}><Store size={14} className="inline mr-1" /> Sucursales</button>
        <button onClick={() => setTab('usuarios')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'usuarios' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}><Users size={14} className="inline mr-1" /> Usuarios</button>
        <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'logs' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}><ClipboardList size={14} className="inline mr-1" /> Auditoría</button>
      </div>

      {tab === 'sucursales' && (
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Store size={18} /> Sucursales</h2>
        <div className="space-y-3">
          {lista.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 p-3 rounded-lg"><Store className="text-brand-600" size={20} /></div>
                <div><h3 className="font-semibold text-gray-800">{s.nombre}</h3>{s.direccion && <p className="text-sm text-gray-500">{s.direccion}</p>}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-center py-8 text-gray-400">No hay sucursales</p>}
        </div>
      </div>
      )}

      {tab === 'usuarios' && (
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Users size={18} /> Usuarios</h2>
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg"><Users className="text-green-600" size={20} /></div>
                <div>
                  <h3 className="font-semibold text-gray-800">{u.nombre}</h3>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${u.rol === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-green-100 text-green-700'}`}>{u.rol}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEditUser(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center py-8 text-gray-400">No hay usuarios</p>}
        </div>
      </div>
      )}

      {tab === 'logs' && (
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><ClipboardList size={18} /> Registro de Auditoría</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Fecha/Hora</th>
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">Sección</th>
                  <th className="text-left px-4 py-3 font-medium">Acción</th>
                  <th className="text-left px-4 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{l.usuario_nombre}</td>
                    <td className="px-4 py-3"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{l.seccion}</span></td>
                    <td className="px-4 py-3">{l.accion}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.detalle ? JSON.stringify(l.detalle) : '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
