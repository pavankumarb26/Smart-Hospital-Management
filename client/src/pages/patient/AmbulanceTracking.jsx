import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import MapView from '../../components/MapView';
import StatusBadge from '../../components/StatusBadge';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AmbulanceTracking() {
  const { location } = useGeolocation();
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get('hospitalId');
  const [ambulances, setAmbulances] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const { subscribe } = useSocketContext();
  const { user } = useAuth();


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
  if (location) {
    markers.push({ lat: location.lat, lng: location.lng, title: 'You (Patient)' });
  }

  if (activeRequest) {
    if (driverLocation) {
      markers.push({ lat: driverLocation.lat, lng: driverLocation.lng, title: `Ambulance (${activeRequest.ambulanceId?.vehicleNumber || 'En Route'})` });
    } else if (activeRequest.ambulanceId?.location?.coordinates) {
      const [lng, lat] = activeRequest.ambulanceId.location.coordinates;
      markers.push({ lat, lng, title: `Ambulance (${activeRequest.ambulanceId?.vehicleNumber || 'En Route'})` });
    }
  } else {
    // Plot all available ambulances
    ambulances.forEach((a) => {
      if (a.latitude != null && a.longitude != null) {
        markers.push({
          lat: a.latitude,
          lng: a.longitude,
          title: `Ambulance: ${a.vehicleNumber} (${a.driverName})`,
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar portal="patient" />
      <div className="max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Ambulance Services</h1>
          <p className="text-gray-500 mt-1">Book an emergency transport or track your assigned ambulance en route</p>
        </div>

        {user?.role !== 'patient' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <strong>⚠️ Warning:</strong> You are currently logged in as a <strong>{user?.role || 'Guest'}</strong>. 
            Only Patient accounts can book an ambulance. Please log out and sign in using a Patient account.
          </div>
        )}

        <div className="bg-white rounded-2xl p-2 shadow-xs border border-gray-100 overflow-hidden">
          <MapView center={location} markers={markers} className="h-80 w-full rounded-xl" />
        </div>

        {activeRequest ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="font-bold text-gray-800">Active Ambulance Request</h2>
                <p className="text-xs text-gray-400 mt-0.5">Requested on {new Date(activeRequest.createdAt).toLocaleTimeString()}</p>
              </div>
              <StatusBadge status={activeRequest.status} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-xs text-gray-400 uppercase tracking-wider block">Driver</span>
                <span className="font-semibold text-gray-700">{activeRequest.driverId?.name || 'Assigning...'}</span>
                {activeRequest.driverId?.phone && (
                  <span className="block text-xs text-blue-600 font-mono mt-1">{activeRequest.driverId.phone}</span>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-xs text-gray-400 uppercase tracking-wider block">Ambulance Vehicle</span>
                <span className="font-semibold text-gray-700">{activeRequest.ambulanceId?.vehicleNumber || 'Assigning...'}</span>
              </div>
            </div>

            {activeRequest.status === 'requested' && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 text-center">
                🕒 Standing by. Waiting for nearby drivers to accept your emergency request.
              </p>
            )}
            {activeRequest.status === 'accepted' && (
              <p className="text-xs text-green-600 bg-green-50 rounded-lg p-3 text-center">
                🚚 Accepted. Driver is heading to your live patient location now.
              </p>
            )}
            {activeRequest.status === 'in_progress' && (
              <p className="text-xs text-purple-600 bg-purple-50 rounded-lg p-3 text-center">
                🏥 Patient Picked Up. Travelling to destination hospital.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-800 text-lg">Available Ambulances Nearby</h2>
            {ambulances.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">
                <p className="font-medium">No ambulances available nearby</p>
                <p className="text-xs text-gray-400 mt-1">Check back in a few moments, or coordinate with a hospital directly.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {ambulances.map((a) => (
                  <div key={a._id} className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-bold text-gray-800">{a.vehicleNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Driver: <span className="font-medium text-gray-700">{a.driverName}</span> &middot; {a.distance} km away
                      </p>
                    </div>
                    <button
                      onClick={() => requestAmbulance(a)}
                      disabled={user?.role !== 'patient'}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

