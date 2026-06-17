import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function PatientLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/patient/register' : '/auth/patient/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      navigate('/patient');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <Link to="/" className="text-blue-600 text-sm mb-4 inline-block">&larr; Back</Link>
        <h1 className="text-2xl font-bold mb-6">{isRegister ? 'Patient Register' : 'Patient Login'}</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <input
                type="text" placeholder="Full Name" required
                className="w-full border rounded-lg px-4 py-2"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                type="tel" placeholder="Phone" required
                className="w-full border rounded-lg px-4 py-2"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </>
          )}
          <input
            type="email" placeholder="Email" required
            className="w-full border rounded-lg px-4 py-2"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Password" required minLength={6}
            className="w-full border rounded-lg px-4 py-2"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="mt-4 text-sm text-blue-600 w-full text-center"
        >
          {isRegister ? 'Already have an account? Login' : 'New patient? Register'}
        </button>
      </div>
    </div>
  );
}