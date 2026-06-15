import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

export default function OPManagement() {
  const [capacity, setCapacity] = useState(50);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/hospital/dashboard').then((r) => setCapacity(r.data.opCapacity));
  }, []);

  const save = async () => {
    await api.patch('/hospital/settings', { dailyOPCapacity: Number(capacity) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily OP Capacity
          </label>
          <input
            type="number" min={1}
            className="w-full border rounded-lg px-4 py-2 mb-4"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <button
            onClick={save}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Save Settings
          </button>
          {saved && <p className="text-green-600 text-sm mt-2 text-center">Saved!</p>}
        </div>
      </div>
    </div>
  );
}
