import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [registrando, setRegistrando] = useState(false);
  const [nombre, setNombre] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (registrando) {
        await register(nombre, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-green-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Copycenter</h1>
          <p className="text-gray-500 mt-2">{registrando ? 'Crear cuenta' : 'Iniciar sesión'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {registrando && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="Tu nombre" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="correo@ejemplo.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-brand-500 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-brand-600 hover:to-green-600 transition-all disabled:opacity-50">
            {loading ? 'Procesando...' : registrando ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {registrando ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button onClick={() => setRegistrando(!registrando)} className="text-brand-600 hover:underline font-medium">
            {registrando ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
}
