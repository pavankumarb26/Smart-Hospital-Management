import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

export default function BedRequest() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientName: '',
    patientAge: '',
    problemDescription: '',
    bedType: 'normal',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/bed-requests', { ...form, hospitalId, patientAge: Number(form.patientAge) });
      setSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar portal="patient" />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Request Sent!</h2>
          <p className="text-gray-500 mb-6">The hospital will review your bed request shortly.</p>
          <button onClick={() => navigate('/patient/bed-requests')} className="text-blue-600">
            View My Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Bed Request</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm">
          <input
            type="text" placeholder="Patient Name" required
            className="w-full border rounded-lg px-4 py-2"
            value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })}
          />
          <input
            type="number" placeholder="Age" required min={1}
            className="w-full border rounded-lg px-4 py-2"
            value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
          />
          <textarea
            placeholder="Describe the problem" required rows={4}
            className="w-full border rounded-lg px-4 py-2"
            value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
          />
          <select
            className="w-full border rounded-lg px-4 py-2"
            value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })}
          >
            <option value="normal">Normal Bed</option>
            <option value="icu">ICU Bed</option>
            <option value="emergency">Emergency Bed</option>
            <option value="ventilator">Ventilator</option>
          </select>
          <button
            type="submit" disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
