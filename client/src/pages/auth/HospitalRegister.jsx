import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';

const BED_TYPES = ['normal', 'icu', 'emergency', 'ventilator'];

const emptyWards = () =>
  Object.fromEntries(BED_TYPES.map((t) => [t, [{ count: '', wardName: '' }]]));

export default function HospitalRegister() {
  const { location, loading: geoLoading, isFallback, refreshLocation } = useGeolocation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'government', description: '', city: '', address: '', phone: '',
    adminEmail: '', password: '', dailyOPCapacity: 50,
    specialties: '', beds: emptyWards(),
    ambulance: { vehicleNumber: '', driverName: '', driverEmail: '', driverPassword: '', driverPhone: '' },
    addAmbulance: false,
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addWardRow = (type) => {
    setForm((f) => ({
      ...f,
      beds: { ...f.beds, [type]: [...f.beds[type], { count: '', wardName: '' }] },
    }));
  };

  const removeWardRow = (type, index) => {
    setForm((f) => ({
      ...f,
      beds: {
        ...f.beds,
        [type]: f.beds[type].filter((_, i) => i !== index),
      },
    }));
  };

  const setWard = (type, index, field, value) => {
    setForm((f) => {
      const rows = [...f.beds[type]];
      rows[index] = { ...rows[index], [field]: value };
      return { ...f, beds: { ...f.beds, [type]: rows } };
    });
  };

  const buildBedConfig = () => {
    const bedConfig = {};
    BED_TYPES.forEach((type) => {
      const valid = form.beds[type]
        .filter((w) => w.count && Number(w.count) > 0)
        .map((w) => ({ count: Number(w.count), wardName: w.wardName || `${type} Ward` }));
      if (valid.length) bedConfig[type] = valid;
    });
    return bedConfig;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError('Please allow GPS location access to register your hospital.');
      return;
    }
    if (isFallback) {
      setError(
        'GPS failed — using Bangalore demo fallback. Registration blocked. ' +
        'Click Refresh GPS on Patient Portal, allow location, then register again from your hospital premises.'
      );
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        type: form.type,
        description: form.description,
        city: form.city,
        address: form.address,
        phone: form.phone,
        adminEmail: form.adminEmail,
        password: form.password,
        lat: location.lat,
        lng: location.lng,
        dailyOPCapacity: Number(form.dailyOPCapacity),
        specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        bedConfig: buildBedConfig(),
        ambulance: form.addAmbulance ? form.ambulance : null,
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      images.forEach((file) => fd.append('images', file));

      await api.post('/auth/hospital/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { data } = await api.post('/auth/hospital/login', {
        email: form.adminEmail,
        password: form.password,
      });
      login(data.token, data.user);
      navigate('/hospital');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <Link to="/login/hospital" className="text-green-600 text-sm mb-4 inline-block">&larr; Back to Login</Link>
        <h1 className="text-2xl font-bold mb-2">Register Your Hospital</h1>
        <p className="text-gray-500 text-sm mb-6">
          Add multiple wards per bed type. Super-Admin must approve before patients can see your hospital.
        </p>

        {geoLoading && <p className="text-blue-600 text-sm mb-4">Getting your GPS location...</p>}
        {location && (
          <p className={`text-sm mb-4 p-2 rounded ${isFallback ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
            GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            {isFallback ? ' — FALLBACK (registration blocked)' : ' — live GPS (locked after registration)'}
            <button type="button" onClick={refreshLocation} className="ml-2 text-blue-600 underline text-xs">
              Refresh GPS
            </button>
          </p>
        )}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <section>
            <h2 className="font-semibold mb-3">Hospital Details</h2>
            <div className="grid gap-3">
              <input required placeholder="Hospital Name" className="border rounded-lg px-4 py-2 w-full"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="border rounded-lg px-4 py-2 w-full"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="government">Government</option>
                <option value="private">Private</option>
              </select>
              <input required placeholder="City" className="border rounded-lg px-4 py-2 w-full"
                value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input placeholder="Address" className="border rounded-lg px-4 py-2 w-full"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input placeholder="Phone" className="border rounded-lg px-4 py-2 w-full"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea placeholder="Description" rows={3} className="border rounded-lg px-4 py-2 w-full"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input placeholder="Specialties (comma separated)" className="border rounded-lg px-4 py-2 w-full"
                value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
              <input type="file" accept="image/*" multiple onChange={(e) => setImages([...e.target.files])}
                className="border rounded-lg px-4 py-2 w-full" />
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-3">Admin Login</h2>
            <div className="grid gap-3">
              <input required type="email" placeholder="Admin Email" className="border rounded-lg px-4 py-2 w-full"
                value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              <input required type="password" placeholder="Password" minLength={6} className="border rounded-lg px-4 py-2 w-full"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <input type="number" placeholder="Daily OP Capacity" className="border rounded-lg px-4 py-2 w-full"
                value={form.dailyOPCapacity} onChange={(e) => setForm({ ...form, dailyOPCapacity: e.target.value })} />
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-3">Beds Setup (auto-creates beds + QR codes)</h2>
            <p className="text-xs text-gray-500 mb-4">Example: Normal Ward A = 10 beds, Normal Ward B = 8 beds</p>
            {BED_TYPES.map((type) => (
              <div key={type} className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm capitalize font-medium text-gray-700">{type} beds</span>
                  <button type="button" onClick={() => addWardRow(type)}
                    className="text-xs text-green-600 hover:text-green-700">+ Add ward</button>
                </div>
                {form.beds[type].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                    <input type="number" min="0" placeholder="Count" className="border rounded-lg px-3 py-2"
                      value={row.count} onChange={(e) => setWard(type, idx, 'count', e.target.value)} />
                    <input placeholder="Ward Name / No." className="border rounded-lg px-3 py-2 col-span-2"
                      value={row.wardName} onChange={(e) => setWard(type, idx, 'wardName', e.target.value)} />
                    {form.beds[type].length > 1 && (
                      <button type="button" onClick={() => removeWardRow(type, idx)}
                        className="col-span-3 text-xs text-red-500 text-left">Remove ward</button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section>
            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={form.addAmbulance}
                onChange={(e) => setForm({ ...form, addAmbulance: e.target.checked })} />
              <span className="font-semibold">Add Ambulance + Driver (optional)</span>
            </label>
            {form.addAmbulance && (
              <div className="grid gap-3">
                <input placeholder="Vehicle Number" className="border rounded-lg px-4 py-2 w-full"
                  value={form.ambulance.vehicleNumber} onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, vehicleNumber: e.target.value } })} />
                <input placeholder="Driver Name" className="border rounded-lg px-4 py-2 w-full"
                  value={form.ambulance.driverName} onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverName: e.target.value } })} />
                <input placeholder="Driver Email" className="border rounded-lg px-4 py-2 w-full"
                  value={form.ambulance.driverEmail} onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverEmail: e.target.value } })} />
                <input placeholder="Driver Password" className="border rounded-lg px-4 py-2 w-full"
                  value={form.ambulance.driverPassword} onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverPassword: e.target.value } })} />
              </div>
            )}
          </section>

          <button type="submit" disabled={loading || geoLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Register Hospital'}
          </button>
        </form>
      </div>
    </div>
  );
}
