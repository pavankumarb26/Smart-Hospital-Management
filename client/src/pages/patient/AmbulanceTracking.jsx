import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import MapView from '../../components/MapView';
import StatusBadge from '../../components/StatusBadge';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function AmbulanceTracking() {
  const { location } = useGeolocation();
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get('hospitalId');
  const [ambulances, setAmbulances] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const { subscribe } = useSocketContext();

  useEffect(() => {
    api.get('/ambulance-requests/active').then((r) => setActiveRequest(r.data));
  }, []);

  useEffect(() => {
    if (!location || activeRequest) return;
    api.post('/ambulance-requests/nearby', { lat: location.lat, lng: location.lng })
      .then((r) => setAmbulances(r.data));
  }, [location, activeRequest]);

  useEffect(() => {
    const unsub1 = subscribe('ambulance:accepted', () => {
      api.get('/ambulance-requests/active').then((r) => setActiveRequest(r.data));
    });
    const unsub2 = subscribe('ambulance:locationUpdate', (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const requestAmbulance = async (amb) => {
    if (!location) return;
    try {
      const { data } = await api.post('/ambulance-requests', {
        ambulanceId: amb._id,
        driverId: amb.driverId,
        hospitalId: hospitalId || amb.hospitalId?._id || amb.hospitalId,
        lat: location.lat,
        lng: location.lng,
      });
      setActiveRequest(data.request);
    } catch (err) {
      alert(err.response?.data?.message || 'Request failed');
    }
  };

  const markers = [];
  if (location) markers.push({ lat: location.lat, lng: location.lng, title: 'You' });
  if (driverLocation) markers.push({ lat: driverLocation.lat, lng: driverLocation.lng, title: 'Ambulance' });
  if (activeRequest?.ambulanceId?.location?.coordinates) {
    const [lng, lat] = activeRequest.ambulanceId.location.coordinates;
    markers.push({ lat, lng, title: 'Ambulance' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Ambulance</h1>

        <MapView center={location} markers={markers} className="h-64 w-full rounded-xl mb-6" />

        {activeRequest ? (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Active Request</h2>
              <StatusBadge status={activeRequest.status} />
            </div>
            {activeRequest.driverId && (
              <p className="text-sm text-gray-600">Driver: {activeRequest.driverId.name}</p>
            )}
            {activeRequest.ambulanceId && (
              <p className="text-sm text-gray-600">Vehicle: {activeRequest.ambulanceId.vehicleNumber}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold">Available Ambulances</h2>
            {ambulances.length === 0 ? (
              <p className="text-gray-500">No ambulances available nearby</p>
            ) : (
              ambulances.map((a) => (
                <div key={a._id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{a.vehicleNumber}</p>
                    <p className="text-sm text-gray-500">{a.driverName} &middot; {a.distance} km</p>
                  </div>
                  <button
                    onClick={() => requestAmbulance(a)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
                  >
                    Request
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
