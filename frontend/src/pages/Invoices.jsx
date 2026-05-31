import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, Users } from 'lucide-react';
import { invoices, companies, auth } from '../services/api';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const tiposIVA = { exonerado: { label: 'Exonerado 0%', divisor: 0 }, '5': { label: 'IVA 5%', divisor: 21 }, '10': { label: 'IVA 10%', divisor: 11 } };

function calcIva(monto, tipo) {
  const cfg = tiposIVA[tipo];
  if (!cfg || cfg.divisor === 0 || !monto) return 0;
  return Math.round((monto / cfg.divisor) * 100) / 100;
}

function csvEsc(str) { return '"' + String(str).replace(/"/g, '""') + '"'; }

export default function Invoices() {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const isAdmin = user?.rol === 'admin';
  const [filtro, setFiltro] = useState({ tipo: '', mes: '', anio: String(new Date().getFullYear()), tipo_iva: '', empresa_id: '', creado_por: '', sucursal_id: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ tipo: 'ingreso', numero_factura: '', fecha: new Date().toISOString().split('T')[0], monto: '', tipo_iva: '10', tipo_pago: 'contado', ruc: '', nombre_cliente: '', cliente_direccion: '', cliente_telefono: '', empresa_id: '', observacion: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    load();
    companies.list().then(setEmpresas).catch(() => {});
    if (isAdmin) {
      auth.listUsers().then(setUsuarios).catch(() => {});
      import('../services/api').then(m => m.branches.list()).then(setSucursales).catch(() => {});
    }
  }, []);

  const load = async () => {
    const params = {};
    if (filtro.tipo) params.tipo = filtro.tipo;
    if (filtro.mes) params.mes = filtro.mes;
    if (filtro.anio) params.anio = filtro.anio;
    if (filtro.tipo_iva) params.tipo_iva = filtro.tipo_iva;
    if (filtro.empresa_id) params.empresa_id = filtro.empresa_id;
    if (isAdmin) {
      if (filtro.creado_por) params.creado_por = filtro.creado_por;
      if (filtro.sucursal_id) params.sucursal_id = filtro.sucursal_id;
    }
    const data = await invoices.list(params);
    setLista(data);
  };

  useEffect(() => { load(); }, [filtro]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await invoices.update(editing, form); toast.success('Factura actualizada'); }
      else { await invoices.create(form); toast.success('Factura creada'); }
      setShowForm(false); setEditing(null); resetForm(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEdit = (f) => {
    setForm({ tipo: f.tipo, numero_factura: f.numero_factura, fecha: f.fecha, monto: String(f.monto), tipo_iva: f.tipo_iva || '10', tipo_pago: f.tipo_pago || 'contado', ruc: f.ruc || '', nombre_cliente: f.nombre_cliente || '', cliente_direccion: f.cliente_direccion || '', cliente_telefono: f.cliente_telefono || '', empresa_id: f.empresa_id || '', observacion: f.observacion || '' });
    setEditing(f.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar factura?')) return;
    try { await invoices.delete(id); toast.success('Factura eliminada'); load(); }
    catch (err) { toast.error('Error al eliminar'); }
  };

  const resetForm = () => setForm({ tipo: 'ingreso', numero_factura: '', fecha: new Date().toISOString().split('T')[0], monto: '', tipo_iva: '10', tipo_pago: 'contado', ruc: '', nombre_cliente: '', cliente_direccion: '', cliente_telefono: '', empresa_id: '', observacion: '' });

  const exportCSV = () => {
    const header = ['Tipo','Nro Factura','Fecha','Monto','IVA','Tipo IVA','Pago','RUC','Cliente','Dirección','Teléfono','Empresa','Observación','Usuario'].map(csvEsc).join(',');
    const rows = filtered.map(f => [f.tipo, f.numero_factura, f.fecha, f.monto, calcIva(f.monto, f.tipo_iva), f.tipo_iva||'10', f.tipo_pago||'contado', f.ruc||'', f.nombre_cliente||'', f.cliente_direccion||'', f.cliente_telefono||'', f.empresa_nombre||'', f.observacion||'', f.creado_por_nombre||''].map(csvEsc).join(','));
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `facturas_${filtro.mes || 'todos'}_${filtro.anio}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const importCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error('CSV vacío'); return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    let count = 0, errors = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx] || '');
      try {
        await invoices.create({
          tipo: row.tipo || 'ingreso',
          numero_factura: row['nro factura'] || row.numero_factura || row.nro || `IMP-${Date.now()}-${i}`,
          fecha: row.fecha || new Date().toISOString().split('T')[0],
          monto: parseFloat(row.monto.replace(/[.,]/g, '')) || 0,
          tipo_iva: row['tipo iva'] || row.tipo_iva || '10',
          tipo_pago: row.pago || row.tipo_pago || 'contado',
          ruc: row.ruc || '',
          nombre_cliente: row.cliente || row.nombre_cliente || '',
          cliente_direccion: row.direccion || '',
          cliente_telefono: row.telefono || '',
          observacion: row.observacion || ''
        });
        count++;
      } catch { errors++; }
    }
    toast.success(`${count} facturas importadas${errors ? `, ${errors} errores` : ''}`);
    load();
    fileRef.current.value = '';
  };

  const filtered = lista.filter(f => {
    if (filtro.search) {
      const s = filtro.search.toLowerCase();
      return f.numero_factura.toLowerCase().includes(s) || (f.nombre_cliente || '').toLowerCase().includes(s) || (f.ruc || '').includes(s) || (f.empresa_nombre || '').toLowerCase().includes(s);
    }
    return true;
  });

  const totalIngresos = filtered.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const totalEgresos = filtered.filter(f => f.tipo === 'egreso').reduce((s, f) => s + f.monto, 0);
  const ivaForm = calcIva(Number(form.monto), form.tipo_iva);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Facturas</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
          <button onClick={() => fileRef.current.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Upload size={16} /> Importar CSV</button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><Download size={16} /> Exportar CSV</button>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"><Plus size={16} /> Nueva Factura</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={filtro.tipo} onChange={e => setFiltro({...filtro, tipo: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option>
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Mes</label>
            <select value={filtro.mes} onChange={e => setFiltro({...filtro, mes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {meses.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Año</label>
            <select value={filtro.anio} onChange={e => setFiltro({...filtro, anio: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              {[2024,2025,2026,2027,2028].map(a => <option key={a} value={a}>{a}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">IVA</label>
            <select value={filtro.tipo_iva} onChange={e => setFiltro({...filtro, tipo_iva: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {Object.entries(tiposIVA).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Empresa</label>
            <select value={filtro.empresa_id} onChange={e => setFiltro({...filtro, empresa_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <input type="text" value={filtro.search} onChange={e => setFiltro({...filtro, search: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nro, cliente..." /></div>
        </div>
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t">
            <div><label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Users size={12} /> Usuario</label>
              <select value={filtro.creado_por} onChange={e => setFiltro({...filtro, creado_por: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Todos los usuarios</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Sucursal</label>
              <select value={filtro.sucursal_id} onChange={e => setFiltro({...filtro, sucursal_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Todas</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select></div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Factura' : 'Nueva Factura'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="ingreso">Ingreso</option><option value="egreso">Egreso</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo Pago</label>
                  <select value={form.tipo_pago} onChange={e => setForm({...form, tipo_pago: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="contado">Contado</option><option value="credito">Crédito</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">N° Factura</label>
                  <input type="text" value={form.numero_factura} onChange={e => setForm({...form, numero_factura: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto Total (Gs)</label>
                  <input type="number" step="0.01" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} className="w-full border rounded-lg px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                  <select value={form.tipo_iva} onChange={e => setForm({...form, tipo_iva: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    {Object.entries(tiposIVA).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {form.monto && form.tipo_iva !== 'exonerado' && <p className="text-xs text-gray-500 mt-1">IVA: Gs {ivaForm.toLocaleString()}</p>}</div>
              </div>
              {form.tipo === 'ingreso' ? (
                <><ClientAutocomplete nombre={form.nombre_cliente} setNombre={v => setForm({...form, nombre_cliente: v})} ruc={form.ruc} setRuc={v => setForm({...form, ruc: v})} direccion={form.cliente_direccion} setDireccion={v => setForm({...form, cliente_direccion: v})} telefono={form.cliente_telefono} setTelefono={v => setForm({...form, cliente_telefono: v})} />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input type="text" value={form.cliente_direccion} onChange={e => setForm({...form, cliente_direccion: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" value={form.cliente_telefono} onChange={e => setForm({...form, cliente_telefono: e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
                  </div></>
              ) : (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa (Proveedor)</label>
                  <select value={form.empresa_id} onChange={e => setForm({...form, empresa_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Seleccionar</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select></div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                <textarea value={form.observacion} onChange={e => setForm({...form, observacion: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-brand-500 text-white py-2 rounded-lg hover:bg-brand-600">{editing ? 'Actualizar' : 'Crear'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
          <div className="text-sm text-gray-500">{filtered.length} facturas</div>
          <div className="flex gap-3 text-sm flex-wrap">
            <span className="text-green-600 font-semibold">Ingresos: Gs {totalIngresos.toLocaleString()}</span>
            <span className="text-red-600 font-semibold">Egresos: Gs {totalEgresos.toLocaleString()}</span>
            <span className={`font-semibold ${totalIngresos - totalEgresos >= 0 ? 'text-brand-600' : 'text-red-600'}`}>Balance: Gs {(totalIngresos - totalEgresos).toLocaleString()}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-3 font-medium">Tipo</th>
                <th className="text-left px-3 py-3 font-medium">N° Factura</th>
                <th className="text-left px-3 py-3 font-medium">Fecha</th>
                <th className="text-right px-3 py-3 font-medium">Monto</th>
                <th className="text-right px-3 py-3 font-medium">IVA</th>
                <th className="text-center px-3 py-3 font-medium">Tipo</th>
                <th className="text-center px-3 py-3 font-medium">Pago</th>
                <th className="text-left px-3 py-3 font-medium">RUC</th>
                <th className="text-left px-3 py-3 font-medium">Cliente / Empresa</th>
                {isAdmin && <th className="text-left px-3 py-3 font-medium">Usuario</th>}
                <th className="text-center px-3 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(f => {
                const iva = calcIva(f.monto, f.tipo_iva);
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${f.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{f.tipo === 'ingreso' ? 'I' : 'E'}</span></td>
                    <td className="px-3 py-3 font-medium">{f.numero_factura}</td>
                    <td className="px-3 py-3">{f.fecha}</td>
                    <td className="px-3 py-3 text-right font-mono">Gs {f.monto.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono text-gray-500">Gs {iva.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{tiposIVA[f.tipo_iva]?.label || '10%'}</span></td>
                    <td className="px-3 py-3 text-center"><span className={`text-xs font-medium ${f.tipo_pago === 'credito' ? 'text-orange-600' : 'text-blue-600'}`}>{f.tipo_pago === 'credito' ? 'Créd' : 'Cont'}</span></td>
                    <td className="px-3 py-3">{f.ruc || '-'}</td>
                    <td className="px-3 py-3">{f.nombre_cliente || f.empresa_nombre || '-'}</td>
                    {isAdmin && <td className="px-3 py-3 text-xs text-gray-500">{f.creado_por_nombre || '-'}</td>}
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => handleEdit(f)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(f.id)} className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 12 : 11} className="text-center py-8 text-gray-400">No hay facturas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
