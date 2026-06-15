import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { subscribe } = useSocketContext();

  const fetchStats = () => api.get('/hospital/dashboard').then((r) => setStats(r.data));

  useEffect(() => {
    fetchStats();
    const unsub = subscribe('bed:statusChanged', fetchStats);
    return unsub;
  }, []);

  if (!stats) return <p className="p-8">Loading...</p>;

  const cards = [
    { label: 'Total Beds', value: stats.total, color: 'blue' },
    { label: 'Occupied', value: stats.occupied, color: 'red' },
    { label: 'Available', value: stats.available, color: 'green' },
    { label: 'ICU Available', value: stats.icuAvailable, color: 'purple' },
    { label: 'Ventilators', value: stats.ventilatorAvailable, color: 'orange' },
    { label: 'OP Today', value: `${stats.opBookingsToday}/${stats.opCapacity}`, color: 'indigo' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hospital Dashboard</h1>

        {stats.opFull && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            OP capacity reached for today. New bookings are blocked.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
