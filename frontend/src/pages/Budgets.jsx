import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, FileDown } from 'lucide-react';
import { budgets, companies } from '../services/api';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { numeroLetras } from '../utils/numeroLetras';
import toast from 'react-hot-toast';

const tiposIVA = { exonerado: { label: 'Exonerado 0%', divisor: 0 }, '5': { label: 'IVA 5%', divisor: 21 }, '10': { label: 'IVA 10%', divisor: 11 } };

function calcIva(total, tipo) {
  const cfg = tiposIVA[tipo];
  if (!cfg || cfg.divisor === 0 || !total) return { iva: 0, subtotal: total };
  const iva = Math.round((total / cfg.divisor) * 100) / 100;
  return { iva, subtotal: Math.round((total - iva) * 100) / 100 };
}

export default function Budgets() {
  const [lista, setLista] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cliente_nombre: '', cliente_ruc: '', cliente_direccion: '', cliente_telefono: '', cliente_email: '',
    notas: '', tipo_iva: '10', empresa_id: '',
    items: [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]
  });

  useEffect(() => { load(); companies.list().then(setEmpresas).catch(() => {}); }, []);

  const load = async () => {
    const data = await budgets.list();
    setLista(data);
  };

  const totalItems = (items) => items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = totalItems(form.items);
    if (total === 0) { toast.error('Agrega al menos un item con precio'); return; }
    const payload = {
      fecha: form.fecha,
      cliente_nombre: form.cliente_nombre,
      cliente_ruc: form.cliente_ruc,
      cliente_direccion: form.cliente_direccion,
      cliente_email: form.cliente_email,
      notas: form.notas,
      tipo_iva: form.tipo_iva,
      empresa_id: form.empresa_id || null,
      items: form.items
    };
    try {
      if (editing) {
        await budgets.update(editing, payload);
        toast.success('Presupuesto actualizado');
      } else {
        await budgets.create(payload);
        toast.success('Presupuesto creado');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleEdit = async (id) => {
    const p = await budgets.get(id);
    setForm({
      fecha: p.fecha, cliente_nombre: p.cliente_nombre, cliente_ruc: p.cliente_ruc || '',
      cliente_direccion: p.cliente_direccion || '', cliente_telefono: p.cliente_telefono || '', cliente_email: p.cliente_email || '',
      notas: p.notas || '', tipo_iva: p.tipo_iva || '10', empresa_id: p.empresa_id || '',
      items: p.items.map(i => ({ descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
    });
    setEditing(id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar presupuesto?')) return;
    try { await budgets.delete(id); toast.success('Presupuesto eliminado'); load(); }
    catch (err) { toast.error('Error al eliminar'); }
  };

  const resetForm = () => setForm({
    fecha: new Date().toISOString().split('T')[0], cliente_nombre: '', cliente_ruc: '', cliente_direccion: '', cliente_email: '',
    notas: '', tipo_iva: '10', empresa_id: '', cliente_telefono: '', items: [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { descripcion: '', cantidad: 1, precio_unitario: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const generarHtmlPresupuesto = (p, emp) => {
    const { iva, subtotal } = calcIva(p.total, p.tipo_iva);
    const enLetras = numeroLetras(p.total);
    return `
      <html><head><title>${p.numero}</title>
      <style>
        @page { margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #333; font-size: 12px; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #f97316; padding-bottom: 15px; margin-bottom: 15px; }
        .header .logo { max-height: 70px; }
        .empresa h2 { color: #ea580c; margin: 0; font-size: 20px; }
        .empresa p { margin: 1px 0; font-size: 11px; color: #555; }
        .titulo { font-size: 22px; font-weight: bold; color: #16a34a; text-align: right; }
        .cliente-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 15px; font-size: 12px; border-left: 4px solid #22c55e; }
        .cliente-box p { margin: 2px 0; }
        .cliente-box .label { color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: linear-gradient(135deg, #f97316, #22c55e); color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
        td:last-child, th:last-child { text-align: right; }
        td:nth-child(3), th:nth-child(3) { text-align: right; }
        .totales { margin-left: auto; width: 280px; margin-top: 10px; }
        .totales p { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
        .totales .total { font-size: 16px; font-weight: bold; color: #16a34a; border-top: 2px solid #333; padding-top: 5px; }
        .letras { font-size: 11px; color: #555; margin-top: 10px; padding: 8px; background: #fff7ed; border-radius: 4px; border-left: 3px solid #f97316; }
        .iva-liq { margin-top: 15px; padding: 10px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; }
        .iva-liq h4 { margin: 0 0 6px 0; font-size: 13px; color: #16a34a; }
        .iva-liq table { width: 100%; font-size: 11px; }
        .iva-liq td { border: none; padding: 2px 6px; }
        .iva-liq td:last-child { text-align: right; }
        .notas { margin-top: 20px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px; }
      </style></head><body>
      <div class="header">
        <div class="empresa">
          <img src="/logo.png" class="logo" style="max-height:60px" onerror="this.style.display='none'" />
          <h2>${emp?.nombre || 'Copycenter'}</h2>
          <p>${emp?.ruc ? `RUC: ${emp.ruc}` : ''}</p>
          <p>${emp?.direccion || ''}</p>
          <p>${emp?.telefono || ''}</p>
          <p>${emp?.email || ''}</p>
        </div>
        <div class="titulo">
          PRESUPUESTO<br/>
          <span style="font-size:14px;color:#666">${p.numero}</span>
        </div>
      </div>
      <div class="cliente-box">
        <p><strong>${p.cliente_nombre}</strong></p>
        <p><span class="label">RUC:</span> ${p.cliente_ruc || '-'}</p>
        <p><span class="label">Dirección:</span> ${p.cliente_direccion || '-'}</p>
        <p><span class="label">Teléfono:</span> ${p.cliente_telefono || '-'}</p>
        <p><span class="label">Email:</span> ${p.cliente_email || '-'}</p>
        <p><span class="label">Fecha:</span> ${p.fecha}</p>
      </div>
      <table>
        <tr><th style="width:50%">Descripción</th><th style="width:10%">Cant.</th><th style="width:18%">P. Unit.</th><th style="width:22%">Total</th></tr>
        ${p.items.map(it => `<tr><td>${it.descripcion}</td><td style="text-align:center">${it.cantidad}</td><td>Gs ${Number(it.precio_unitario).toLocaleString()}</td><td>Gs ${Number(it.total).toLocaleString()}</td></tr>`).join('')}
      </table>
      <div class="iva-liq">
        <h4>Liquidación del IVA</h4>
        <table>
          <tr><td>IVA 5% (${p.tipo_iva === '5' ? `Gs ${iva.toLocaleString()}` : 'Gs 0'})</td><td>Valor Ventas 5%: Gs ${p.tipo_iva === '5' ? subtotal.toLocaleString() : '0'}</td></tr>
          <tr><td>IVA 10% (${p.tipo_iva === '10' ? `Gs ${iva.toLocaleString()}` : 'Gs 0'})</td><td>Valor Ventas 10%: Gs ${p.tipo_iva === '10' ? subtotal.toLocaleString() : '0'}</td></tr>
          <tr><td>Exentas (${p.tipo_iva === 'exonerado' ? `Gs ${p.total.toLocaleString()}` : 'Gs 0'})</td><td>Valor Ventas Exentas: Gs ${p.tipo_iva === 'exonerado' ? p.total.toLocaleString() : '0'}</td></tr>
          <tr style="font-weight:bold;border-top:1px solid #ccc"><td>Total IVA: Gs ${iva.toLocaleString()}</td><td>Total Ventas: Gs ${p.total.toLocaleString()}</td></tr>
        </table>
      </div>
      <div class="letras"><strong>Son:</strong> ${enLetras} GUARANÍES</div>
      <div class="totales">
        <p><span>Subtotal (sin IVA):</span><span>Gs ${subtotal.toLocaleString()}</span></p>
        <p><span>IVA ${tiposIVA[p.tipo_iva]?.label || '10%'}:</span><span>Gs ${iva.toLocaleString()}</span></p>
        <p class="total"><span>Total a pagar:</span><span>Gs ${p.total.toLocaleString()}</span></p>
      </div>
      ${p.notas ? `<div class="notas"><strong>Notas:</strong><br/>${p.notas}</div>` : ''}
      <div class="footer">Documento generado por Copycenter - Sistema de Facturación</div>
      </body></html>
    `;
  };

  const printPresupuesto = async (id) => {
    const p = await budgets.get(id);
    const emp = empresas.find(e => e.id === p.empresa_id);
    const html = generarHtmlPresupuesto(p, emp);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  const downloadPDF = async (id) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const p = await budgets.get(id);
    const emp = empresas.find(e => e.id === p.empresa_id);
    const container = document.createElement('div');
    container.innerHTML = generarHtmlPresupuesto(p, emp);
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${p.numero}.pdf`);
      toast.success('PDF descargado');
    } catch (e) {
      toast.error('Error al generar PDF, usa "Imprimir"');
    }
    document.body.removeChild(container);
  };

  const { iva: formIva, subtotal: formSubtotal } = calcIva(totalItems(form.items), form.tipo_iva);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
          <Plus size={16} /> Nuevo Presupuesto
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo IVA</label>
                  <select value={form.tipo_iva} onChange={e => setForm({ ...form, tipo_iva: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                    {Object.entries(tiposIVA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <ClientAutocomplete nombre={form.cliente_nombre} setNombre={v => setForm({ ...form, cliente_nombre: v })} ruc={form.cliente_ruc} setRuc={v => setForm({ ...form, cliente_ruc: v })} direccion={form.cliente_direccion} setDireccion={v => setForm({ ...form, cliente_direccion: v })} telefono={form.cliente_telefono} setTelefono={v => setForm({ ...form, cliente_telefono: v })} email={form.cliente_email} setEmail={v => setForm({ ...form, cliente_email: v })} requiredName />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={form.cliente_direccion} onChange={e => setForm({ ...form, cliente_direccion: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.cliente_email} onChange={e => setForm({ ...form, cliente_email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (tu empresa / logo)</label>
                <select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Copycenter (por defecto)</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Items</label>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Agregar item</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <input type="text" placeholder="Descripción" value={item.descripcion} onChange={e => updateItem(i, 'descripcion', e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" required />
                    <input type="number" placeholder="Cant" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} className="w-20 border rounded-lg px-3 py-2 text-sm" min="1" required />
                    <input type="number" placeholder="P. Unit" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', Number(e.target.value))} className="w-28 border rounded-lg px-3 py-2 text-sm" min="0" step="1" required />
                    <span className="py-2 text-sm font-mono w-28 text-right">Gs {(item.cantidad * item.precio_unitario).toLocaleString()}</span>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                    )}
                  </div>
                ))}
                <div className="text-right text-sm space-y-1 pt-2 border-t">
                  <p>Subtotal (sin IVA): Gs {formSubtotal.toLocaleString()}</p>
                  <p>IVA ({tiposIVA[form.tipo_iva]?.label}): Gs {formIva.toLocaleString()}</p>
                  <p className="font-bold text-lg">Total a pagar: Gs {totalItems(form.items).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800">{editing ? 'Actualizar' : 'Crear Presupuesto'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {lista.map(p => {
          const { iva } = calcIva(p.total, p.tipo_iva);
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800">{p.numero}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.estado === 'aceptado' ? 'bg-green-100 text-green-700' :
                      p.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                      p.estado === 'enviado' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{p.estado}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{tiposIVA[p.tipo_iva]?.label || '10%'}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{p.cliente_nombre} {p.cliente_ruc && `- ${p.cliente_ruc}`}</p>
                  <p className="text-xs text-gray-400">{p.fecha} | IVA: Gs {iva.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">Gs {p.total.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => downloadPDF(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"><FileDown size={14} /> PDF</button>
                <button onClick={() => printPresupuesto(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"><Download size={14} /> Imprimir</button>
                <button onClick={() => handleEdit(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"><Edit2 size={14} /> Editar</button>
                <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"><Trash2 size={14} /> Eliminar</button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div className="text-center py-12 text-gray-400">No hay presupuestos</div>
        )}
      </div>
    </div>
  );
}
