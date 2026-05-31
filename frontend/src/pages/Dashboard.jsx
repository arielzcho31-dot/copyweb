import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt, Building2, FileText, Calendar } from 'lucide-react';
import { invoices, companies, budgets } from '../services/api';

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Dashboard() {
  const [resumen, setResumen] = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0 });
  const [stats, setStats] = useState({ facturas: 0, empresas: 0, presupuestos: 0 });
  const [resumenMensual, setResumenMensual] = useState([]);
  const [mes, setMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [anio, setAnio] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    invoices.resumen({ mes, anio }).then(setResumen).catch(() => {});
    invoices.list({ mes, anio }).then(d => setStats(s => ({ ...s, facturas: d.length }))).catch(() => {});
    companies.list().then(d => setStats(s => ({ ...s, empresas: d.length }))).catch(() => {});
    budgets.list().then(d => setStats(s => ({ ...s, presupuestos: d.length }))).catch(() => {});

    // Cargar resumen de todos los meses del año
    const promesas = meses.map(async (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      try {
        const r = await invoices.resumen({ mes: m, anio });
        return { mes: m, label: meses[i], ingresos: r.totalIngresos, egresos: r.totalEgresos, balance: r.balance };
      } catch { return { mes: m, label: meses[i], ingresos: 0, egresos: 0, balance: 0 }; }
    });
    Promise.all(promesas).then(setResumenMensual);
  }, [anio]);

  const cards = [
    { label: 'Ingresos', value: `Gs ${resumen.totalIngresos.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Egresos', value: `Gs ${resumen.totalEgresos.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-500' },
    { label: 'Balance', value: `Gs ${resumen.balance.toLocaleString()}`, icon: Wallet, color: resumen.balance >= 0 ? 'bg-brand-500' : 'bg-red-500' },
    { label: 'Facturas', value: stats.facturas, icon: Receipt, color: 'bg-indigo-500' },
    { label: 'Empresas', value: stats.empresas, icon: Building2, color: 'bg-green-600' },
    { label: 'Presupuestos', value: stats.presupuestos, icon: FileText, color: 'bg-brand-500' }
  ];

  const totalAnual = resumenMensual.reduce((s, r) => ({ ingresos: s.ingresos + r.ingresos, egresos: s.egresos + r.egresos }), { ingresos: 0, egresos: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <select value={anio} onChange={e => setAnio(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {[2024, 2025, 2026, 2027, 2028].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg text-white`}><c.icon size={24} /></div>
            <div><p className="text-sm text-gray-500">{c.label}</p><p className="text-xl font-bold text-gray-800">{c.value}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Calendar size={18} className="text-brand-500" />
          <h2 className="font-semibold text-gray-800">Resumen Mensual {anio}</h2>
          <span className="text-sm text-gray-400 ml-auto">Total: Gs {totalAnual.ingresos.toLocaleString()} ingresos / Gs {totalAnual.egresos.toLocaleString()} egresos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Mes</th>
                <th className="text-right px-4 py-3 font-medium">Ingresos</th>
                <th className="text-right px-4 py-3 font-medium">Egresos</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {resumenMensual.map(r => (
                <tr key={r.mes} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.label}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-mono">Gs {r.ingresos.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono">Gs {r.egresos.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${r.balance >= 0 ? 'text-brand-600' : 'text-red-600'}`}>Gs {r.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
