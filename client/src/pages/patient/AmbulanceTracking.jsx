import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import MapView from '../../components/MapView';
import StatusBadge from '../../components/StatusBadge';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AmbulanceTracking() {
  const { location, loading: geoLoading, refreshLocation } = useGeolocation();
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get('hospitalId');
  const [ambulances, setAmbulances] = useState([]);
  const [loadingAmbulances, setLoadingAmbulances] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { subscribe } = useSocketContext();
  const { user } = useAuth();
  const pollingRef = useRef(null);

  const fetchActiveRequest = useCallback(async () => {
    try {
      const { data } = await api.get('/ambulance-requests/active');
      setActiveRequest(data);
      if (data?.ambulanceId?.location?.coordinates) {
        const [lng, lat] = data.ambulanceId.location.coordinates;
        setDriverLocation((prev) => prev || { lat, lng });
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const fetchNearbyAmbulances = useCallback(async (loc) => {
    if (!loc) return;
    setLoadingAmbulances(true);
    try {
      const payload = { lat: loc.lat, lng: loc.lng };
      if (hospitalId) payload.hospitalId = hospitalId;
      const { data } = await api.post('/ambulance-requests/nearby', payload);
      setAmbulances(data);
    } catch {
      setAmbulances([]);
    } finally {
      setLoadingAmbulances(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchActiveRequest();
  }, [fetchActiveRequest]);

  useEffect(() => {
    if (!location || activeRequest) return;
    fetchNearbyAmbulances(location);
  }, [location, activeRequest, fetchNearbyAmbulances]);

  // Polling fallback when an active request exists to guarantee real-time updates
  useEffect(() => {
    if (activeRequest && ['requested', 'accepted', 'in_progress'].includes(activeRequest.status)) {
      pollingRef.current = setInterval(async () => {
        const req = await fetchActiveRequest();
        if (!req || ['completed', 'cancelled', 'rejected'].includes(req.status)) {
          clearInterval(pollingRef.current);
          if (location) fetchNearbyAmbulances(location);
        }
      }, 5000);
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [activeRequest, fetchActiveRequest, location, fetchNearbyAmbulances]);

  // Socket event subscriptions
  useEffect(() => {
    const unsubAccepted = subscribe('ambulance:accepted', (data) => {
      fetchActiveRequest();
    });

    const unsubLoc = subscribe('ambulance:locationUpdate', (data) => {
      if (data?.lat && data?.lng) {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }
    });

    const unsubPickup = subscribe('ambulance:pickup', (data) => {
      fetchActiveRequest();
    });

    const unsubCompleted = subscribe('ambulance:completed', () => {
      alert('Ambulance transport has been completed. Glad you reached safely!');
      setActiveRequest(null);
      setDriverLocation(null);
      if (location) fetchNearbyAmbulances(location);
    });

    const unsubRejected = subscribe('ambulance:rejected', (data) => {
      alert(data?.message || 'Driver was unable to accept your request. Please select another ambulance.');
      setActiveRequest(null);
      setDriverLocation(null);
      if (location) fetchNearbyAmbulances(location);
    });

    const unsubCancelled = subscribe('ambulance:cancelled', () => {
      setActiveRequest(null);
      setDriverLocation(null);
      if (location) fetchNearbyAmbulances(location);
    });

    return () => {
      unsubAccepted();
      unsubLoc();
      unsubPickup();
      unsubCompleted();
      unsubRejected();
      unsubCancelled();
    };
  }, [subscribe, fetchActiveRequest, location, fetchNearbyAmbulances]);

  const requestAmbulance = async (amb) => {
    if (!location) {
      alert('Waiting for GPS coordinates. Please ensure location services are enabled.');
      return;
    }
    setActionLoading(true);
    try {
      const { data } = await api.post('/ambulance-requests', {
        ambulanceId: amb._id,
        driverId: amb.driverId?._id || amb.driverId,
        hospitalId: hospitalId || amb.hospitalId?._id || amb.hospitalId,
        lat: location.lat,
        lng: location.lng,
      });
      setActiveRequest(data.request);
      if (amb.latitude != null && amb.longitude != null) {
        setDriverLocation({ lat: amb.latitude, lng: amb.longitude });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest?._id) return;
    if (!window.confirm('Are you sure you want to cancel this ambulance request?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/ambulance-requests/${activeRequest._id}/cancel`);
      setActiveRequest(null);
      setDriverLocation(null);
      if (location) fetchNearbyAmbulances(location);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  // Build Map Markers
  const markers = [];
  if (location) {
    markers.push({
      lat: location.lat,
      lng: location.lng,
      title: 'You (Patient Location)',
      type: 'patient',
    });
  }

  if (activeRequest) {
    const ambLat = driverLocation?.lat || (activeRequest.ambulanceId?.location?.coordinates ? activeRequest.ambulanceId.location.coordinates[1] : null);
    const ambLng = driverLocation?.lng || (activeRequest.ambulanceId?.location?.coordinates ? activeRequest.ambulanceId.location.coordinates[0] : null);

    if (ambLat != null && ambLng != null) {
      markers.push({
        lat: ambLat,
        lng: ambLng,
        title: `Ambulance: ${activeRequest.ambulanceId?.vehicleNumber || 'Assigned'} (${activeRequest.driverId?.name || 'Driver'})`,
        type: 'ambulance',
      });
    }

    if (activeRequest.hospitalId?.location?.coordinates) {
      const [hLng, hLat] = activeRequest.hospitalId.location.coordinates;
      markers.push({
        lat: hLat,
        lng: hLng,
        title: `Hospital: ${activeRequest.hospitalId.name}`,
        type: 'hospital',
      });
    }
  } else {
    ambulances.forEach((a) => {
      if (a.latitude != null && a.longitude != null) {
        markers.push({
          lat: a.latitude,
          lng: a.longitude,
          title: `Ambulance ${a.vehicleNumber} - Driver: ${a.driverName} (${a.distance} km away)`,
          type: 'ambulance',
        });
      }
    });
  }

  // Calculate Distance & ETA to Patient
  let liveDistanceKm = null;
  let etaMins = null;
  if (activeRequest && location) {
    const ambLat = driverLocation?.lat || activeRequest.ambulanceId?.location?.coordinates?.[1];
    const ambLng = driverLocation?.lng || activeRequest.ambulanceId?.location?.coordinates?.[0];
    if (ambLat && ambLng) {
      const dLat = (ambLat - location.lat) * Math.PI / 180;
      const dLng = (ambLng - location.lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(location.lat * Math.PI / 180) *
        Math.cos(ambLat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      liveDistanceKm = Math.round(6371 * c * 10) / 10;
      // Assuming avg urban speed of 40 km/h: (distance / 40) * 60
      etaMins = Math.max(1, Math.round((liveDistanceKm / 40) * 60));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar portal="patient" />
      <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Ambulance Services</h1>
            <p className="text-gray-500 mt-1">Book an emergency transport or track your assigned ambulance with live GPS</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                refreshLocation();
                if (location) fetchNearbyAmbulances(location);
              }}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs flex items-center gap-1.5"
            >
              🔄 Refresh Location
            </button>
          </div>
        </div>

        {user?.role !== 'patient' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <strong>⚠️ Warning:</strong> You are currently logged in as a <strong>{user?.role || 'Guest'}</strong>. 
            Only Patient accounts can book an ambulance. Please log out and sign in using a Patient account.
          </div>
        )}

        {/* Map View */}
        <div className="bg-white rounded-2xl p-2 shadow-xs border border-gray-100 overflow-hidden">
          <MapView center={location} markers={markers} className="h-80 w-full rounded-xl" />
          <div className="flex items-center justify-center gap-6 py-2 text-xs text-gray-600 bg-gray-50 border-t border-gray-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> You (Patient)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-600 inline-block"></span> Ambulance
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span> Hospital
            </span>
          </div>
        </div>

        {activeRequest ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Active Emergency Booking</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Requested at {new Date(activeRequest.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <StatusBadge status={activeRequest.status} />
            </div>

            {/* Live Tracking Card */}
            {liveDistanceKm != null && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-wider block">Live Ambulance Proximity</span>
                  <p className="text-2xl font-black text-orange-950 mt-0.5">
                    {liveDistanceKm} <span className="text-sm font-semibold text-orange-700">km away</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-orange-700 block">Estimated Arrival</span>
                  <p className="text-xl font-bold text-orange-900 mt-0.5">
                    ~{etaMins} <span className="text-xs font-semibold">mins</span>
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold">Driver Details</span>
                <span className="font-bold text-gray-800 text-base block mt-1">
                  {activeRequest.driverId?.name || 'Assigning Driver...'}
                </span>
                {activeRequest.driverId?.phone && (
                  <a
                    href={`tel:${activeRequest.driverId.phone}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold font-mono mt-2 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    📞 Call: {activeRequest.driverId.phone}
                  </a>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold">Vehicle & Hospital</span>
                <span className="font-bold text-gray-800 text-base block mt-1 font-mono">
                  {activeRequest.ambulanceId?.vehicleNumber || 'Assigning Vehicle...'}
                </span>
                <span className="block text-xs text-gray-500 mt-2">
                  Hospital: {activeRequest.hospitalId?.name || 'Emergency Network'}
                </span>
              </div>
            </div>

            {activeRequest.status === 'requested' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                <p className="text-xs text-amber-800 font-medium">
                  🕒 Standing by. Waiting for nearby drivers to accept your emergency request. Live GPS will update immediately upon acceptance.
                </p>
                <button
                  onClick={cancelRequest}
                  disabled={actionLoading}
                  className="bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel Ambulance Request'}
                </button>
              </div>
            )}

            {activeRequest.status === 'accepted' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-3">
                <p className="text-xs text-green-800 font-semibold">
                  🚚 Request Accepted! Driver is en route to your live patient location now. Tracking live GPS.
                </p>
                <button
                  onClick={cancelRequest}
                  disabled={actionLoading}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium underline"
                >
                  Cancel Request
                </button>
              </div>
            )}

            {activeRequest.status === 'in_progress' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-800 font-semibold">
                  🏥 Patient On Board! Travelling towards destination hospital.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Available Ambulances Nearby</h2>
                {hospitalId && (
                  <span className="text-xs text-blue-600 font-medium">Filtering by selected hospital</span>
                )}
              </div>
              <button
                onClick={() => location && fetchNearbyAmbulances(location)}
                disabled={loadingAmbulances || !location}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
              >
                {loadingAmbulances ? 'Searching...' : 'Refresh List'}
              </button>
            </div>

            {loadingAmbulances || geoLoading ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">
                <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                <p className="font-medium">Finding available ambulances near your location...</p>
              </div>
            ) : ambulances.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100 space-y-2">
                <p className="font-medium text-gray-700">No ambulances currently available</p>
                <p className="text-xs text-gray-400">
                  Drivers might currently be offline or on active rides. You can try refreshing or coordinate with a hospital directly.
                </p>
                <button
                  onClick={() => location && fetchNearbyAmbulances(location)}
                  className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Check Again
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {ambulances.map((a) => (
                  <div
                    key={a._id}
                    className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚑</span>
                        <p className="font-bold text-gray-800 text-base font-mono">{a.vehicleNumber}</p>
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Available
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Driver: <span className="font-semibold text-gray-700">{a.driverName}</span> &middot;{' '}
                        <span className="font-bold text-orange-600">{a.distance} km away</span>
                      </p>
                      {a.hospitalId?.name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Stationed at: <span className="text-gray-600 font-medium">{a.hospitalId.name}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => requestAmbulance(a)}
                      disabled={user?.role !== 'patient' || actionLoading}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {actionLoading ? 'Requesting...' : 'Request Ambulance'}
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

