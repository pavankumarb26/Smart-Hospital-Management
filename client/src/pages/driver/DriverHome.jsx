import { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import { useAuth } from '../../context/AuthContext';
import { useSocketContext } from '../../context/SocketContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

export default function DriverHome() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const { subscribe, emit } = useSocketContext();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('offline');
  const [rideRequest, setRideRequest] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    api.get('/driver/profile').then((r) => {
      setProfile(r.data);
      setStatus(r.data.status);
    });
  }, []);

  useEffect(() => {
    const unsub = subscribe('ambulance:request', (data) => setRideRequest(data));
    const unsub2 = subscribe('ambulance:priorityAlert', (data) => {
      setRideRequest((prev) => prev || { requestId: data.requestId, priority: true, message: data.message });
    });
    return () => { unsub(); unsub2(); };
  }, []);

  useEffect(() => {
    if (status === 'available' || status === 'busy') {
      intervalRef.current = setInterval(() => {
        if (location && profile) {
          emit('driver:locationUpdate', {
            driverId: user.id,
            ambulanceId: profile.ambulanceId?._id || profile.ambulanceId,
            lat: location.lat,
            lng: location.lng,
          });
        }
      }, 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [status, location, profile]);

  const changeStatus = async (newStatus) => {
    await api.patch('/driver/status', { status: newStatus });
    emit('driver:statusChange', { status: newStatus });
    setStatus(newStatus);
  };

  const acceptRide = async () => {
    const { data } = await api.patch(`/driver/ambulance-requests/${rideRequest.requestId}/accept`);
    setActiveRide(data);
    setRideRequest(null);
    setStatus('busy');

    if (location && rideRequest.patientLocation) {
      const { lat, lng } = rideRequest.patientLocation;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${lat},${lng}&travelmode=driving`,
        '_blank'
      );
    }
  };

  const rejectRide = async () => {
    await api.patch(`/driver/ambulance-requests/${rideRequest.requestId}/reject`);
    setRideRequest(null);
  };

  const markPickup = async () => {
    const { data } = await api.patch(`/driver/ambulance-requests/${activeRide._id}/pickup`);
    setActiveRide(data);
    if (data.hospitalId?.location?.coordinates) {
      const [lng, lat] = data.hospitalId.location.coordinates;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${lat},${lng}&travelmode=driving`,
        '_blank'
      );
    }
  };

  const markComplete = async () => {
    await api.patch(`/driver/ambulance-requests/${activeRide._id}/complete`);
    setActiveRide(null);
    setStatus('available');
  };

  const markers = [];
  if (location) {
    markers.push({ lat: location.lat, lng: location.lng, title: 'You (Driver)' });
  }

  if (activeRide) {
    if (activeRide.status === 'accepted' && activeRide.patientLocation?.coordinates) {
      const [pLng, pLat] = activeRide.patientLocation.coordinates;
      markers.push({ lat: pLat, lng: pLng, title: 'Patient Pickup Point' });
    } else if (activeRide.status === 'in_progress' && activeRide.hospitalId?.location?.coordinates) {
      const [hLng, hLat] = activeRide.hospitalId.location.coordinates;
      markers.push({ lat: hLat, lng: hLng, title: activeRide.hospitalId.name || 'Destination Hospital' });
    }
  } else if (rideRequest && rideRequest.patientLocation) {
    markers.push({ lat: rideRequest.patientLocation.lat, lng: rideRequest.patientLocation.lng, title: 'Patient Emergency Request' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar portal="driver" />
      <div className="max-w-md mx-auto px-4 py-8 w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Driver Portal</h1>
          {profile && (
            <p className="text-gray-500 mt-1">
              {profile.name} &middot; <span className="font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold">{profile.ambulanceId?.vehicleNumber}</span>
            </p>
          )}
        </div>

        {/* Map View showing driver position and patient route */}
        <div className="bg-white rounded-2xl p-2 shadow-xs border border-gray-100 overflow-hidden">
          <MapView
            center={location}
            markers={markers}
            className="h-64 w-full rounded-xl"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Status</p>
          <div className="flex gap-2">
            {['available', 'busy', 'offline'].map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  status === s ? 'bg-orange-600 text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <StatusBadge status={status} />
          </div>
        </div>

        {rideRequest && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-extrabold text-orange-900 text-lg">New Emergency Request!</h2>
              <p className="text-xs text-orange-700 mt-0.5">A patient needs urgent transport. Standby coordinates locked.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={acceptRide} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs">
                Accept Ride
              </button>
              <button onClick={rejectRide} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs">
                Reject
              </button>
            </div>
          </div>
        )}

        {activeRide && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="font-bold text-gray-800">Active Emergency Ride</h2>
                <p className="text-xs text-gray-400 mt-0.5">Assigned to vehicle {profile?.ambulanceId?.vehicleNumber}</p>
              </div>
              <StatusBadge status={activeRide.status} />
            </div>

            {activeRide.status === 'accepted' && (
              <div className="space-y-2">
                <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg text-center font-medium">
                  Please drive to the patient pickup location shown on the map.
                </p>
                <button onClick={markPickup} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs">
                  Mark Patient Picked Up
                </button>
              </div>
            )}

            {activeRide.status === 'in_progress' && (
              <div className="space-y-2">
                <p className="text-xs text-purple-700 bg-purple-50 p-3 rounded-lg text-center font-medium">
                  Patient on board. Navigate to hospital destination shown on the map.
                </p>
                <button onClick={markComplete} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs">
                  Mark Transport Complete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

