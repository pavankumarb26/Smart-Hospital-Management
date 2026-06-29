import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function BedRequest() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (user?.role !== 'patient') {
      alert('Access Denied: You must be logged in as a Patient to submit a bed request. If you are logged in as a Hospital Admin or Driver, please log out first.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/bed-requests', { ...form, hospitalId, patientAge: Number(form.patientAge) });
      setSuccess(true);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Request failed';
      if (errMsg === 'Access denied') {
        alert('Access Denied: You must be logged in as a Patient to request a bed. If you are logged in as a Hospital Admin, you cannot request beds.');
      } else {
        alert(errMsg);
      }
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

        {user?.role !== 'patient' && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <strong>⚠️ Warning:</strong> You are currently logged in as a <strong>{user?.role || 'Guest'}</strong>. 
            Only accounts registered as a Patient can submit bed requests. Please log out and sign in using a Patient account.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm">
          <input
            type="text" placeholder="Patient Name" required
            className="w-full border rounded-lg px-4 py-2"
            value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            disabled={user?.role !== 'patient'}
          />
          <input
            type="number" placeholder="Age" required min={1}
            className="w-full border rounded-lg px-4 py-2"
            value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
            disabled={user?.role !== 'patient'}
          />
          <textarea
            placeholder="Describe the problem" required rows={4}
            className="w-full border rounded-lg px-4 py-2"
            value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
            disabled={user?.role !== 'patient'}
          />
          <select
            className="w-full border rounded-lg px-4 py-2"
            value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })}
            disabled={user?.role !== 'patient'}
          >
            <option value="normal">Normal Bed — Request → Hospital Approval → Reserve</option>
            <option value="icu">ICU Bed — Emergency (Hospital + Ambulance Alert)</option>
            <option value="emergency">Emergency Bed — Priority Handling</option>
            <option value="ventilator">Ventilator — Emergency (Hospital + Ambulance Alert)</option>
          </select>
          {['icu', 'emergency', 'ventilator'].includes(form.bedType) && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              Emergency request: hospital and ambulance fleet will be alerted immediately.
            </p>
          )}
          <button
            type="submit" disabled={loading || user?.role !== 'patient'}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
