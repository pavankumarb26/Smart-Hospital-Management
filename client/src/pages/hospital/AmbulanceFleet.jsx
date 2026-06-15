import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function AmbulanceFleet() {
  const [ambulances, setAmbulances] = useState([]);
  const [markers, setMarkers] = useState([]);
  const { subscribe } = useSocketContext();

  const fetchAmbulances = () => {
    api.get('/hospital/ambulances').then((r) => {
      setAmbulances(r.data);
      setMarkers(
        r.data
          .filter((a) => a.location?.coordinates?.[0])
          .map((a) => ({
            lat: a.location.coordinates[1],
            lng: a.location.coordinates[0],
            title: a.vehicleNumber,
          }))
      );
    });
  };

  useEffect(() => {
    fetchAmbulances();
    const unsub1 = subscribe('ambulance:locationUpdate', (data) => {
      setMarkers((prev) => {
        const updated = prev.filter((m) => m.title !== data.ambulanceId);
        return [...updated, { lat: data.lat, lng: data.lng, title: String(data.ambulanceId) }];
      });
      fetchAmbulances();
    });
    const unsub2 = subscribe('ambulance:statusChanged', fetchAmbulances);
    return () => { unsub1(); unsub2(); };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Ambulance Fleet</h1>
        <MapView markers={markers} className="h-64 w-full rounded-xl mb-6" />
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
