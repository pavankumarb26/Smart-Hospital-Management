import { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="driver" />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Driver Portal</h1>
        {profile && (
          <p className="text-gray-500 mb-6">
            {profile.name} &middot; {profile.ambulanceId?.vehicleNumber}
          </p>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <p className="text-sm text-gray-500 mb-3">Your Status</p>
          <div className="flex gap-2">
            {['available', 'busy', 'offline'].map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`flex-1 py-2 rounded-lg text-sm capitalize ${
                  status === s ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <StatusBadge status={status} />
          </div>
        </div>

        {rideRequest && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-lg mb-2">New Ride Request!</h2>
            <p className="text-sm text-gray-600 mb-4">A patient needs an ambulance nearby</p>
            <div className="flex gap-2">
              <button onClick={acceptRide} className="flex-1 bg-green-600 text-white py-2 rounded-lg">
                Accept
              </button>
              <button onClick={rejectRide} className="flex-1 bg-red-600 text-white py-2 rounded-lg">
                Reject
              </button>
            </div>
          </div>
        )}

        {activeRide && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Active Ride</h2>
              <StatusBadge status={activeRide.status} />
            </div>
            {activeRide.status === 'accepted' && (
              <button onClick={markPickup} className="w-full bg-blue-600 text-white py-2 rounded-lg mb-2">
                Patient Picked Up
              </button>
            )}
            {activeRide.status === 'in_progress' && (
              <button onClick={markComplete} className="w-full bg-green-600 text-white py-2 rounded-lg">
                Mark Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
