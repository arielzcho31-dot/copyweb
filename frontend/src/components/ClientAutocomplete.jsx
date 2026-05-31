import { useState, useRef, useEffect, useCallback } from 'react';
import { companies } from '../services/api';

export default function ClientAutocomplete({ nombre, setNombre, ruc, setRuc, direccion, setDireccion, telefono, setTelefono, email, setEmail, requiredName }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounce = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    setLoading(true);
    try {
      const results = await companies.search(q);
      setSuggestions(results);
      setShowSug(results.length > 0);
    } catch {} finally { setLoading(false); }
  }, []);

  const handleNameChange = (val) => {
    setNombre(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(val), 250);
  };

  const handleRucChange = (val) => {
    setRuc(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(val), 250);
  };

  const select = useCallback((item) => {
    setNombre(item.nombre);
    setRuc(item.ruc);
    if (setDireccion) setDireccion(item.direccion || '');
    if (setTelefono) setTelefono(item.telefono || '');
    if (setEmail) setEmail(item.email || '');
    setShowSug(false);
    setSuggestions([]);
  }, [setNombre, setRuc, setDireccion, setTelefono, setEmail]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RUC del Cliente</label>
          <input type="text" value={ruc} onChange={e => handleRucChange(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Buscar por RUC..." autoComplete="off" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label>
          <input type="text" value={nombre} onChange={e => handleNameChange(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Buscar por nombre..." required={requiredName} autoComplete="off" />
        </div>
      </div>
      {loading && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
      {showSug && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(item); }}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm flex flex-col cursor-pointer"
            >
              <span className="font-medium">{item.nombre}</span>
              <span className="text-gray-400 text-xs">{item.ruc} {item.direccion ? `| ${item.direccion}` : ''} {item.telefono ? `| ${item.telefono}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
