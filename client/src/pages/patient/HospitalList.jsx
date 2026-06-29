import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import HospitalCard from '../../components/HospitalCard';
import MapView from '../../components/MapView';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

export default function HospitalList() {
  const { location, loading: geoLoading, error: geoError, isFallback, refreshLocation } = useGeolocation();
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileTab, setMobileTab] = useState('list'); // 'list' or 'map'

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

  // Filter hospitals locally by search query (name or specialty)
  const filteredHospitals = hospitals.filter((h) => {
    const query = searchQuery.toLowerCase();
    const matchesName = h.name.toLowerCase().includes(query);
    const matchesSpecialty = h.specialties?.some((s) => s.toLowerCase().includes(query));
    const matchesCity = h.city.toLowerCase().includes(query);
    return matchesName || matchesSpecialty || matchesCity;
  });

  // Markers for the map
  const mapMarkers = filteredHospitals
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => ({
      lat: h.latitude,
      lng: h.longitude,
      title: `${h.name} (${h.available?.normal || 0} normal beds available)`,
    }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar portal="patient" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Left Side: Hospital List, Filters, GPS Details */}
        <div className={`flex-1 lg:max-w-xl xl:max-w-2xl p-6 overflow-y-auto lg:h-[calc(100vh-64px)] ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nearby Hospitals</h1>
              <p className="text-gray-500 mt-1">Real-time availability and straight-line GPS distances</p>
            </div>

            {/* GPS Panel */}
            <div className="bg-white border border-gray-100 shadow-xs rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between transition-all">
              <div className="space-y-1">
                {location && (
                  <p className="text-sm font-semibold text-gray-800">
                    My Location: <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                  </p>
                )}
                {isFallback ? (
                  <p className="text-amber-600 text-xs font-medium">
                    ⚠️ Demo fallback active (Bangalore) — click Refresh GPS to use your actual location.
                  </p>
                ) : (
                  <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
                    Live high-accuracy GPS active
                  </p>
                )}
                {geoError && !isFallback && (
                  <p className="text-red-500 text-xs">{geoError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={refreshLocation}
                disabled={geoLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                {geoLoading ? 'Acquiring GPS...' : 'Refresh GPS'}
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-white border border-gray-100 shadow-xs rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by name, specialty..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  >
                    <option value="">All Cities</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Loader / Errors */}
            {(geoLoading || loading) && (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading hospitals...</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Hospital Cards List */}
            <div className="space-y-4">
              {filteredHospitals.map((h) => (
                <HospitalCard key={h._id} hospital={h} />
              ))}
            </div>

            {!loading && !geoLoading && filteredHospitals.length === 0 && (
              <div className="text-gray-500 text-center py-16 space-y-3 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-4xl">🔍</div>
                <p className="font-semibold text-gray-700">No hospitals found</p>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Try searching a different keyword, clearing your filters, or registering a hospital in this area.
                </p>
              </div>
            )}

            {!loading && filteredHospitals.length > 0 && filteredHospitals[0].distance > 100 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs">
                ⚠️ Hospitals appear far away because they are registered in other cities. Please use the search bar or select your specific city from the filter options above.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sticky Interactive Map */}
        <div className={`flex-1 h-[calc(100vh-64px-50px)] lg:h-[calc(100vh-64px)] bg-gray-100 relative lg:sticky lg:top-[64px] ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
          <MapView
            center={location}
            markers={mapMarkers}
            className="w-full h-full"
          />
        </div>

        {/* Mobile Toggle Bar */}
        <div className="lg:hidden sticky bottom-0 z-40 bg-white border-t flex h-12 shadow-md">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 text-center font-medium text-sm flex items-center justify-center gap-2 ${mobileTab === 'list' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 text-center font-medium text-sm flex items-center justify-center gap-2 ${mobileTab === 'map' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}
          >
            🗺️ Map View
          </button>
        </div>
      </div>
    </div>
  );
}
