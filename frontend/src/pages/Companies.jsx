import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { companies } from '../services/api';
import toast from 'react-hot-toast';

export default function Companies() {
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', ruc: '', direccion: '', telefono: '', email: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await companies.list();
    setLista(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await companies.update(editing, form);
        toast.success('Empresa actualizada');
      } else {
        await companies.create(form);
        toast.success('Empresa creada');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleEdit = (e) => {
    setForm({ nombre: e.nombre, ruc: e.ruc, direccion: e.direccion || '', telefono: e.telefono || '', email: e.email || '' });
    setEditing(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar empresa?')) return;
    try {
      await companies.delete(id);
      toast.success('Empresa eliminada');
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => setForm({ nombre: '', ruc: '', direccion: '', telefono: '', email: '' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Empresas</h1>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
          <Plus size={16} /> Nueva Empresa
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                <input type="text" value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">{editing ? 'Actualizar' : 'Crear'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map(e => (
          <div key={e.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-lg"><Building2 className="text-purple-600" size={24} /></div>
                <div>
                  <h3 className="font-semibold text-gray-800">{e.nombre}</h3>
                  <p className="text-sm text-gray-500">RUC: {e.ruc}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(e.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            {e.direccion && <p className="text-sm text-gray-500 mt-2">📍 {e.direccion}</p>}
            {e.telefono && <p className="text-sm text-gray-500">📞 {e.telefono}</p>}
            {e.email && <p className="text-sm text-gray-500">✉️ {e.email}</p>}
          </div>
        ))}
        {lista.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">No hay empresas registradas</div>
        )}
      </div>
    </div>
  );
}
