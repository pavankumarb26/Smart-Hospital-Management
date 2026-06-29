import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function AmbulanceFleet() {
  const [ambulances, setAmbulances] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [hospitalLocation, setHospitalLocation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vehicleNumber: '', driverName: '', driverEmail: '', driverPassword: '', driverPhone: '',
  });
  const [error, setError] = useState('');
  const { subscribe } = useSocketContext();

  const fetchAmbulances = (hospitalLoc) => {
    api.get('/hospital/ambulances').then((r) => {
      setAmbulances(r.data);
      const ambMarkers = r.data
        .filter((a) => a.location?.coordinates?.[0])
        .map((a) => ({
          lat: a.location.coordinates[1],
          lng: a.location.coordinates[0],
          title: `🚚 ${a.vehicleNumber} [${a.status.toUpperCase()}] - Driver: ${a.driverName}`,
        }));

      if (hospitalLoc) {
        setMarkers([
          { lat: hospitalLoc.lat, lng: hospitalLoc.lng, title: '🏥 Our Hospital Location' },
          ...ambMarkers
        ]);
      } else {
        setMarkers(ambMarkers);
      }
    });
  };

  useEffect(() => {
    api.get('/hospital/profile').then((r) => {
      if (r.data?.location?.coordinates) {
        const loc = {
          lat: r.data.location.coordinates[1],
          lng: r.data.location.coordinates[0]
        };
        setHospitalLocation(loc);
        fetchAmbulances(loc);
      } else {
        fetchAmbulances(null);
      }
    });

    const unsub1 = subscribe('ambulance:locationUpdate', () => fetchAmbulances(hospitalLocation));
    const unsub2 = subscribe('ambulance:statusChanged', () => fetchAmbulances(hospitalLocation));
    return () => { unsub1(); unsub2(); };
  }, [hospitalLocation]);

  const addFleet = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/hospital/fleet', form);
      setForm({ vehicleNumber: '', driverName: '', driverEmail: '', driverPassword: '', driverPhone: '' });
      setShowForm(false);
      fetchAmbulances();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add fleet');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ambulance Fleet</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">
            + Add Ambulance & Driver
          </button>
        </div>

        {showForm && (
          <form onSubmit={addFleet} className="bg-white p-4 rounded-xl shadow-sm mb-6 grid md:grid-cols-2 gap-3">
            <input required placeholder="Vehicle Number" className="border rounded-lg px-3 py-2"
              value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
            <input required placeholder="Driver Name" className="border rounded-lg px-3 py-2"
              value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            <input required type="email" placeholder="Driver Email (login)" className="border rounded-lg px-3 py-2"
              value={form.driverEmail} onChange={(e) => setForm({ ...form, driverEmail: e.target.value })} />
            <input required placeholder="Driver Password" className="border rounded-lg px-3 py-2"
              value={form.driverPassword} onChange={(e) => setForm({ ...form, driverPassword: e.target.value })} />
            <input placeholder="Driver Phone" className="border rounded-lg px-3 py-2 md:col-span-2"
              value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
            <button type="submit" className="md:col-span-2 bg-orange-600 text-white py-2 rounded-lg">Add Fleet</button>
            {error && <p className="md:col-span-2 text-red-600 text-sm">{error}</p>}
          </form>
        )}

        <MapView center={hospitalLocation} markers={markers} className="h-64 w-full rounded-xl mb-6 shadow-xs border border-gray-200" />
        <div className="grid gap-3">
          {ambulances.map((a) => (
            <div key={a._id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-semibold">{a.vehicleNumber}</p>
                <p className="text-sm text-gray-500">{a.driverName}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
