import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import BedCard from '../../components/BedCard';
import api from '../../services/api';

export default function BedManagement() {
  const [beds, setBeds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [form, setForm] = useState({ wardName: '', bedNumber: '', type: 'normal' });
  const [batch, setBatch] = useState({ type: 'normal', wardName: '', count: '' });

  const fetchBeds = () => api.get('/hospital/beds').then((r) => setBeds(r.data));

  useEffect(() => { fetchBeds(); }, []);

  const createBed = async (e) => {
    e.preventDefault();
    await api.post('/hospital/beds', form);
    setForm({ wardName: '', bedNumber: '', type: 'normal' });
    setShowForm(false);
    fetchBeds();
  };

  const addBatch = async (e) => {
    e.preventDefault();
    await api.post('/hospital/beds/batch', {
      type: batch.type,
      wardName: batch.wardName,
      count: Number(batch.count),
    });
    setBatch({ type: 'normal', wardName: '', count: '' });
    setShowBatch(false);
    fetchBeds();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bed Management</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowBatch(!showBatch)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Add Beds (Batch)
            </button>
            <button onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
              + Single Bed
            </button>
          </div>
        </div>

        {showBatch && (
          <form onSubmit={addBatch} className="bg-white p-4 rounded-xl shadow-sm mb-6 grid md:grid-cols-4 gap-3">
            <select className="border rounded-lg px-3 py-2" value={batch.type}
              onChange={(e) => setBatch({ ...batch, type: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="icu">ICU</option>
              <option value="emergency">Emergency</option>
              <option value="ventilator">Ventilator</option>
            </select>
            <input placeholder="Ward Name" required className="border rounded-lg px-3 py-2"
              value={batch.wardName} onChange={(e) => setBatch({ ...batch, wardName: e.target.value })} />
            <input type="number" min="1" placeholder="Count" required className="border rounded-lg px-3 py-2"
              value={batch.count} onChange={(e) => setBatch({ ...batch, count: e.target.value })} />
            <button type="submit" className="bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create + QR</button>
          </form>
        )}

        {showForm && (
          <form onSubmit={createBed} className="bg-white p-4 rounded-xl shadow-sm mb-6 grid md:grid-cols-4 gap-3">
            <input
              placeholder="Ward Name" required
              className="border rounded-lg px-3 py-2"
              value={form.wardName} onChange={(e) => setForm({ ...form, wardName: e.target.value })}
            />
            <input
              placeholder="Bed Number" required
              className="border rounded-lg px-3 py-2"
              value={form.bedNumber} onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="icu">ICU</option>
              <option value="emergency">Emergency</option>
              <option value="ventilator">Ventilator</option>
            </select>
            <button type="submit" className="bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
          </form>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {beds.map((bed) => (
            <BedCard key={bed._id} bed={bed} showQR />
          ))}
        </div>
      </div>
    </div>
  );
}
