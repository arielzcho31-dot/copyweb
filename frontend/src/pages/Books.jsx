import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Trash2, Edit2 } from 'lucide-react';
import { books, branches } from '../services/api';
import toast from 'react-hot-toast';

export default function Books() {
  const [tab, setTab] = useState('ventas');
  const [libros, setLibros] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showVentaForm, setShowVentaForm] = useState(false);
  const [editingLibro, setEditingLibro] = useState(null);
  const [editingVenta, setEditingVenta] = useState(null);
  const [filtro, setFiltro] = useState({ libro_id: '', sucursal_id: '', repuesto: '' });
  const [catFiltro, setCatFiltro] = useState({ formato: '', color: '' });
  const [form, setForm] = useState({ titulo: '', autor: '', editorial: '', isbn: '', precio: 0, formato: 'formato_libro', color: 'blanco_negro' });
  const [ventaForm, setVentaForm] = useState({ libro_id: '', libro_search: '', fecha: new Date().toISOString().split('T')[0], sucursal_id: '', repuesto: false, cantidad: 1, precio: 0, observacion: '', formato: 'formato_libro', color: 'blanco_negro' });
  const [bookSearchResults, setBookSearchResults] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  const searchBooks = async (q) => {
    if (!q || q.length < 2) { setBookSearchResults([]); setShowBookDropdown(false); return; }
    const results = await books.list({ q });
    setBookSearchResults(results);
    setShowBookDropdown(true);
  };

  useEffect(() => { loadLibros(); branches.list().then(setSucursales).catch(() => {}); }, [catFiltro]);
  useEffect(() => { if (tab === 'libros') loadLibros(); }, [search, tab]);
  useEffect(() => { loadVentas(); }, [filtro, search]);
  useEffect(() => { if (tab === 'ventas') loadVentas(); }, [tab]);

  const loadLibros = async () => {
    const params = {};
    if (search) params.q = search;
    if (catFiltro.formato) params.formato = catFiltro.formato;
    if (catFiltro.color) params.color = catFiltro.color;
    setLibros(await books.list(params));
  };
  const loadVentas = async () => {
    const params = {};
    if (filtro.libro_id) params.libro_id = filtro.libro_id;
    if (filtro.sucursal_id) params.sucursal_id = filtro.sucursal_id;
    if (filtro.repuesto !== '') params.repuesto = filtro.repuesto;
    setVentas(await books.ventas(params));
  };

  const handleSaveLibro = async (e) => {
    e.preventDefault();
    try {
      if (editingLibro) { await books.update(editingLibro, form); toast.success('Libro actualizado'); }
      else { await books.create(form); toast.success('Libro creado'); }
      setShowForm(false); setEditingLibro(null); setForm({ titulo: '', autor: '', editorial: '', isbn: '', precio: 0, formato: 'formato_libro', color: 'blanco_negro' }); loadLibros();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEditLibro = (l) => {
    setForm({ titulo: l.titulo, autor: l.autor || '', editorial: l.editorial || '', isbn: l.isbn || '', precio: Number(l.precio) || 0, formato: l.formato || 'formato_libro', color: l.color || 'blanco_negro' });
    setEditingLibro(l.id);
    setShowForm(true);
  };

  const handleDeleteLibro = async (id) => {
    if (!confirm('¿Eliminar libro y todas sus ventas?')) return;
    try { await books.delete(id); toast.success('Libro eliminado'); loadLibros(); loadVentas(); }
    catch (err) { toast.error('Error'); }
  };

  const handleCrearVenta = async (e) => {
    e.preventDefault();
    try {
      let libroId = ventaForm.libro_id;
      if (!libroId && ventaForm.libro_search.trim()) {
        const newLibro = await books.create({ titulo: ventaForm.libro_search.trim(), formato: ventaForm.formato, color: ventaForm.color });
        libroId = newLibro.id;
      }
      if (!libroId) { toast.error('Seleccioná o escribí el nombre del libro'); return; }
      await books.crearVenta({ ...ventaForm, libro_id: libroId });
      toast.success('Venta registrada'); setShowVentaForm(false); resetVentaForm(); loadVentas(); loadLibros();
    }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEditVenta = (v) => {
    setVentaForm({ libro_id: v.libro_id, libro_search: v.libro_titulo || '', fecha: v.fecha, sucursal_id: v.sucursal_id || '', repuesto: !!v.repuesto, cantidad: v.cantidad, precio: v.precio, observacion: v.observacion || '', formato: v.formato || 'formato_libro', color: v.color || 'blanco_negro' });
    setEditingVenta(v.id);
    setShowVentaForm(true);
  };

  const handleUpdateVenta = async (e) => {
    e.preventDefault();
    try {
      let libroId = ventaForm.libro_id;
      if (!libroId && ventaForm.libro_search.trim()) {
        const newLibro = await books.create({ titulo: ventaForm.libro_search.trim(), formato: ventaForm.formato, color: ventaForm.color });
        libroId = newLibro.id;
      }
      await books.actualizarVenta(editingVenta, { ...ventaForm, libro_id: libroId || ventaForm.libro_id });
      toast.success('Venta actualizada'); setShowVentaForm(false); setEditingVenta(null); resetVentaForm(); loadVentas();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDeleteVenta = async (id) => {
    if (!confirm('¿Eliminar venta?')) return;
    try { await books.eliminarVenta(id); toast.success('Venta eliminada'); loadVentas(); loadLibros(); }
    catch (err) { toast.error('Error'); }
  };

  const resetVentaForm = () => { setVentaForm({ libro_id: '', libro_search: '', fecha: new Date().toISOString().split('T')[0], sucursal_id: '', repuesto: false, cantidad: 1, precio: 0, observacion: '', formato: 'formato_libro', color: 'blanco_negro' }); setShowBookDropdown(false); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Libros</h1>
        <div className="flex gap-2">
          <button onClick={() => { resetVentaForm(); setEditingVenta(null); setShowVentaForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"><Plus size={16} /> Registrar Venta</button>
          <button onClick={() => { setEditingLibro(null); setForm({ titulo: '', autor: '', editorial: '', isbn: '', precio: 0, formato: 'formato_libro', color: 'blanco_negro' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Plus size={16} /> Nuevo Libro</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('ventas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'ventas' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Ventas</button>
        <button onClick={() => setTab('libros')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'libros' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Catálogo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingLibro(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingLibro ? 'Editar Libro' : 'Nuevo Libro'}</h2>
            <form onSubmit={handleSaveLibro} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label><input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Autor</label><input type="text" value={form.autor} onChange={e => setForm({...form, autor: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Editorial</label><input type="text" value={form.editorial} onChange={e => setForm({...form, editorial: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio (Gs)</label><input type="number" value={form.precio} onChange={e => setForm({...form, precio: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                  <select value={form.formato} onChange={e => setForm({...form, formato: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="formato_libro">Formato Libro</option>
                    <option value="mini">Mini</option>
                    <option value="libro_abierto">Libro Abierto</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="blanco_negro">Blanco y Negro</option>
                    <option value="color">Color</option>
                  </select></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">{editingLibro ? 'Guardar Cambios' : 'Crear'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingLibro(null); }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVentaForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowVentaForm(false); setEditingVenta(null); resetVentaForm(); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingVenta ? 'Editar Venta' : 'Registrar Venta de Libro'}</h2>
            <form onSubmit={editingVenta ? handleUpdateVenta : handleCrearVenta} className="space-y-3">
              <div className="relative"><label className="block text-sm font-medium text-gray-700 mb-1">Libro *</label>
                <input type="text" value={ventaForm.libro_search} onChange={e => { setVentaForm({...ventaForm, libro_search: e.target.value, libro_id: '' }); searchBooks(e.target.value); }} onFocus={e => { if (e.target.value.length >= 2) setShowBookDropdown(true); }} onBlur={() => setTimeout(() => setShowBookDropdown(false), 200)} className="w-full border rounded-lg px-3 py-2" placeholder="Buscar o escribir nuevo libro..." autoComplete="off" />
                {showBookDropdown && bookSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {bookSearchResults.map(l => {
                      const fmtMap = { mini: 'Mini', formato_libro: 'FL', libro_abierto: 'LA' };
                      return (
                        <button key={l.id} type="button" onClick={() => { setVentaForm(prev => ({...prev, libro_id: l.id, libro_search: l.titulo, formato: l.formato || 'formato_libro', color: l.color || 'blanco_negro', precio: Number(l.precio) || 0 })); setShowBookDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-brand-50 text-sm border-b last:border-b-0">
                          {l.titulo} <span className="text-xs text-gray-400">({fmtMap[l.formato] || l.formato} / {l.color === 'color' ? 'Color' : 'ByN'})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label><input type="date" value={ventaForm.fecha} onChange={e => setVentaForm({...ventaForm, fecha: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label><input type="number" value={ventaForm.cantidad} onChange={e => setVentaForm({...ventaForm, cantidad: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2" min="1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio (Gs)</label><input type="number" value={ventaForm.precio} onChange={e => setVentaForm({...ventaForm, precio: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                  <select value={ventaForm.sucursal_id} onChange={e => setVentaForm({...ventaForm, sucursal_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Seleccionar</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                  <select value={ventaForm.formato} onChange={e => setVentaForm({...ventaForm, formato: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="formato_libro">Formato Libro</option>
                    <option value="mini">Mini</option>
                    <option value="libro_abierto">Libro Abierto</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select value={ventaForm.color} onChange={e => setVentaForm({...ventaForm, color: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="blanco_negro">Blanco y Negro</option>
                    <option value="color">Color</option>
                  </select></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="repuesto" checked={ventaForm.repuesto} onChange={e => setVentaForm({...ventaForm, repuesto: e.target.checked})} className="rounded" />
                <label htmlFor="repuesto" className="text-sm text-gray-700">Repuesto (repo)</label>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observación</label><input type="text" value={ventaForm.observacion} onChange={e => setVentaForm({...ventaForm, observacion: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-brand-500 text-white py-2 rounded-lg hover:bg-brand-600">{editingVenta ? 'Guardar Cambios' : 'Registrar'}</button>
                <button type="button" onClick={() => { setShowVentaForm(false); setEditingVenta(null); resetVentaForm(); }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'ventas' && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Libro</label>
                <select value={filtro.libro_id} onChange={e => setFiltro({...filtro, libro_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  {libros.map(l => {
                    const fmtMap = { mini: 'Mini', formato_libro: 'FL', libro_abierto: 'LA' };
                    return <option key={l.id} value={l.id}>{l.titulo} ({fmtMap[l.formato] || l.formato} / {l.color === 'color' ? 'Color' : 'ByN'})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sucursal</label>
                <select value={filtro.sucursal_id} onChange={e => setFiltro({...filtro, sucursal_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Repuesto</label>
                <select value={filtro.repuesto} onChange={e => setFiltro({...filtro, repuesto: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Buscar libro</label>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nombre del libro..." />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Libro</th>
                    <th className="text-left px-4 py-3 font-medium">Fecha</th>
                    <th className="text-center px-4 py-3 font-medium">Cant.</th>
                    <th className="text-right px-4 py-3 font-medium">Precio</th>
                    <th className="text-center px-4 py-3 font-medium">Formato</th>
                    <th className="text-center px-4 py-3 font-medium">Color</th>
                    <th className="text-center px-4 py-3 font-medium">Repuesto</th>
                    <th className="text-left px-4 py-3 font-medium">Sucursal</th>
                    <th className="text-center px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ventas.map(v => {
                    const fmtMap = { mini: 'Mini', formato_libro: 'Formato Libro', libro_abierto: 'Libro Abierto' };
                    return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{v.libro_titulo || v.libro_id}</td>
                      <td className="px-4 py-3">{v.fecha}</td>
                      <td className="px-4 py-3 text-center">{v.cantidad}</td>
                      <td className="px-4 py-3 text-right font-mono">Gs {Number(v.precio).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{fmtMap[v.formato] || v.formato}</span></td>
                      <td className="px-4 py-3 text-center"><span className={`text-xs px-1.5 py-0.5 rounded ${v.color === 'color' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{v.color === 'color' ? 'Color' : 'ByN'}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${v.repuesto ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v.repuesto ? 'Sí' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3">{v.sucursal_nombre || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEditVenta(v)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteVenta(v.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1" title="Eliminar"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )})}
                  {ventas.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">No hay ventas registradas</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'libros' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Buscar</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Título, autor o ISBN..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Formato</label>
              <select value={catFiltro.formato} onChange={e => setCatFiltro({...catFiltro, formato: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Todos</option>
                <option value="formato_libro">Formato Libro</option>
                <option value="mini">Mini</option>
                <option value="libro_abierto">Libro Abierto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <select value={catFiltro.color} onChange={e => setCatFiltro({...catFiltro, color: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Todos</option>
                <option value="blanco_negro">Blanco y Negro</option>
                <option value="color">Color</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {libros.map(l => {
              const fmtMap = { mini: 'Mini', formato_libro: 'Formato Libro', libro_abierto: 'Libro Abierto' };
              return (
              <div key={l.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-100 p-2 rounded-lg"><BookOpen className="text-brand-600" size={20} /></div>
                    <div><h3 className="font-semibold text-gray-800">{l.titulo}</h3>{l.autor && <p className="text-xs text-gray-500">{l.autor}</p>}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditLibro(l)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteLibro(l.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{fmtMap[l.formato] || l.formato}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${l.color === 'color' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{l.color === 'color' ? 'Color' : 'ByN'}</span>
                </div>
                {l.precio > 0 && <p className="text-xs font-semibold text-brand-600 mt-2">Gs {Number(l.precio).toLocaleString()}</p>}
                {l.editorial && <p className="text-xs text-gray-400 mt-1">Editorial: {l.editorial}</p>}
                {l.isbn && <p className="text-xs text-gray-400">ISBN: {l.isbn}</p>}
              </div>
            )})}
            {libros.length === 0 && <div className="col-span-full text-center py-8 text-gray-400">No hay libros en el catálogo</div>}
          </div>
        </div>
      )}
    </div>
  );
}
