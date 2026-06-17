import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import HospitalCard from '../../components/HospitalCard';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

export default function HospitalList() {
  const { location, loading: geoLoading, error: geoError, isFallback, refreshLocation } = useGeolocation();
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/hospitals/cities').then((r) => setCities(r.data)).catch(() => {});
  }, []);

  const fetchHospitals = async () => {
    if (!location) return;
    setError('');
    try {
      const params = { lat: location.lat, lng: location.lng };
      if (cityFilter) params.city = cityFilter;
      const { data } = await api.get('/hospitals/nearby', { params });
      if (import.meta.env.DEV) {
        console.log('[distance-debug] patient:', { userLatitude: location.lat, userLongitude: location.lng });
        data.forEach((h) => {
          console.log('[distance-debug]', {
            hospitalName: h.name,
            city: h.city,
            latitude: h.latitude,
            longitude: h.longitude,
            distance: h.distance,
          });
        });
      }
      setHospitals(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetchHospitals();
    const interval = setInterval(fetchHospitals, 60000);
    return () => clearInterval(interval);
  }, [location, cityFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Nearby Hospitals</h1>
        <p className="text-gray-500 mb-4">Straight-line distance from your GPS location</p>

        <div className="bg-white border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
          <div>
            {location && (
              <p className="text-sm text-gray-700">
                Your location: <span className="font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </p>
            )}
            {isFallback ? (
              <p className="text-amber-600 text-sm mt-1">
                Demo fallback (Bangalore) — distances will be wrong unless you are in Bangalore.
                Click &quot;Refresh GPS&quot; and allow location.
              </p>
            ) : (
              <p className="text-green-600 text-sm mt-1">Live GPS active</p>
            )}
            {geoError && !isFallback && (
              <p className="text-red-600 text-xs mt-1">{geoError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={refreshLocation}
            disabled={geoLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {geoLoading ? 'Getting GPS...' : 'Refresh GPS'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <select
            className="border rounded-lg px-4 py-2 flex-1"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by city..."
            className="border rounded-lg px-4 py-2 flex-1"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          />
        </div>

        {(geoLoading || loading) && <p className="text-gray-500">Loading hospitals...</p>}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="grid gap-4">
          {hospitals.map((h) => (
            <HospitalCard key={h._id} hospital={h} />
          ))}
        </div>

        {!loading && !geoLoading && hospitals.length === 0 && (
          <div className="text-gray-500 text-center py-12 space-y-2">
            <p>No approved hospitals found for this search.</p>
            <p className="text-sm">Register a hospital at your real GPS location and get Super-Admin approval.</p>
          </div>
        )}

        {!loading && hospitals.length > 0 && hospitals[0].distance > 100 && (
          <p className="text-amber-700 text-sm text-center mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Hospitals are far away because they were registered in a different city.
            Register a hospital near you, or filter by city name above.
          </p>
        )}
      </div>
    </div>
  );
}
