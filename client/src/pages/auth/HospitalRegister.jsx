import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';

const BED_TYPES = ['normal', 'icu', 'emergency', 'ventilator'];

const emptyWards = () =>
  Object.fromEntries(BED_TYPES.map((t) => [t, [{ count: '', wardName: '' }]]));

export default function HospitalRegister() {
  const { location, loading: geoLoading, isFallback, refreshLocation } = useGeolocation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', type: 'private', description: '', city: '', address: '', phone: '',
    adminEmail: '', password: '', dailyOPCapacity: 50,
    specialties: '', beds: emptyWards(),
    ambulance: { vehicleNumber: '', driverName: '', driverEmail: '', driverPassword: '', driverPhone: '' },
    addAmbulance: false,
    website: '',
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OpenStreetMap / Nominatim state
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = () => {
      const L = window.L;
      if (!L) return;

      if (mapRef.current && !mapInstance.current) {
        const defaultCenter = location
          ? [location.lat, location.lng]
          : [12.9716, 77.5946];

        mapInstance.current = L.map(mapRef.current).setView(defaultCenter, 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstance.current);

        // Add user's location marker
        if (location) {
          L.marker([location.lat, location.lng], {
            icon: L.divIcon({
              className: 'user-marker',
              html: '<div style="width:20px;height:20px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          })
            .addTo(mapInstance.current)
            .bindPopup('Your Location')
            .openPopup();
        }
      }
    };

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (window.L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map center when location changes
  useEffect(() => {
    const L = window.L;
    if (mapInstance.current && location && L) {
      mapInstance.current.setView([location.lat, location.lng], 14);

      // Update or add user location marker
      if (!mapInstance.current._userMarker) {
        mapInstance.current._userMarker = L.marker([location.lat, location.lng], {
          icon: L.divIcon({
            className: 'user-marker',
            html: '<div style="width:20px;height:20px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(mapInstance.current).bindPopup('Your Location');
      }
    }
  }, [location]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);

  const handlePlaceSelected = useCallback((place) => {
    const L = window.L;
    if (!L || !mapInstance.current) return;

    setSelectedPlace(place);
    clearMarkers();

    // Differentiate marker colors: private = blue (#2563eb), government = red (#dc2626)
    const markerColor = form.type === 'government' ? '#dc2626' : '#2563eb';

    // Add single marker for selected place
    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        className: 'selected-marker',
        html: `<div style="
          background: ${markerColor};
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 4px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="transform:rotate(45deg);color:white;font-size:16px;">🏥</span>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }),
    }).addTo(mapInstance.current);

    marker.bindPopup(`<b>${place.name}</b><br>✓ Selected`).openPopup();
    markersRef.current.push(marker);

    // Center map on selected place
    mapInstance.current.setView([place.lat, place.lng], 17);

    // Auto-fill form with place details (Name, Address, City, Postcode are standard)
    setForm(f => ({
      ...f,
      name: place.name || f.name,
      address: place.address || f.address,
      city: place.city || f.city,
    }));
  }, [clearMarkers, form.type]);

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) return;

    const L = window.L;
    if (!L || !mapInstance.current) return;

    setSearchLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedPlace(null);
    clearMarkers();

    try {
      const params = new URLSearchParams({
        q: `${query} hospital`,
        format: 'json',
        addressdetails: 1,
        limit: 20,
        'accept-language': 'en',
      });

      // Add nearby bias if location available
      if (location) {
        params.set('lat', location.lat.toString());
        params.set('lon', location.lng.toString());
        params.set('bounded', '1');
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await response.json();

      if (!data || data.length === 0) {
        setError('No matching hospital found near your location. Please refine your search.');
        return;
      }

      // Filter to show only places that look like hospitals
      const hospitals = data.filter(place => {
        const displayName = (place.display_name || '').toLowerCase();
        const type = (place.type || '').toLowerCase();
        const classType = (place.class || '').toLowerCase();
        return (
          displayName.includes('hospital') ||
          displayName.includes('clinic') ||
          displayName.includes('medical') ||
          displayName.includes('health') ||
          type === 'hospital' ||
          type === 'clinic' ||
          type === 'doctors' ||
          classType === 'hospital' ||
          classType === 'health'
        );
      });

      if (hospitals.length === 0) {
        setError('No matching hospital found near your location. Please refine your search.');
        return;
      }

      const formattedResults = hospitals.map((place, idx) => ({
        placeId: place.place_id,
        name: place.display_name.split(',')[0],
        fullName: place.display_name,
        address: place.display_name,
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        type: place.type,
        city: place.address?.city || place.address?.town || place.address?.village || '',
        country: place.address?.country || '',
        postcode: place.address?.postcode || '',
      }));

      setSearchResults(formattedResults);

      // Differentiate marker colors: private = blue (#2563eb), government = red (#dc2626)
      const markerColor = form.type === 'government' ? '#dc2626' : '#2563eb';

      // Add markers for all results
      const bounds = [];
      markersRef.current = formattedResults.map((place, idx) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({
            className: 'hospital-marker',
            html: `<div style="
              background: ${markerColor};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="transform:rotate(45deg);color:white;font-size:12px;font-weight:bold;">${idx + 1}</span>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
        }).addTo(mapInstance.current);

        // Render popup content with Details + "Select & Confirm" button
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 4px;">
            <b style="font-size: 14px; color: #1e293b;">${place.name}</b><br>
            <span style="color: #64748b; display: block; margin-top: 4px; margin-bottom: 8px;">${place.fullName}</span>
            <button id="confirm-${place.placeId}" style="
              background: #22c55e;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: bold;
              font-size: 11px;
              width: 100%;
              transition: background 0.2s;
            ">Select & Confirm</button>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`confirm-${place.placeId}`);
          if (btn) {
            btn.onclick = () => {
              handlePlaceSelected(place);
              mapInstance.current.closePopup();
            };
          }
        });

        bounds.push([place.lat, place.lng]);
        return marker;
      });

      // Fit map to show all markers
      if (bounds.length > 0) {
        mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search hospitals. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [location, clearMarkers, form.type, handlePlaceSelected]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleCreateCustomLocation = () => {
    const L = window.L;
    if (!L || !mapInstance.current) return;
    clearMarkers();

    const defaultCoords = location || { lat: 12.9716, lng: 77.5946 };
    const place = {
      placeId: 'custom-' + Date.now(),
      name: form.name || 'My Custom Hospital',
      fullName: form.address || 'Custom Location Coordinates',
      address: form.address || '',
      lat: defaultCoords.lat,
      lng: defaultCoords.lng,
      type: 'custom',
      city: form.city || '',
      country: '',
      postcode: '',
    };
    setSelectedPlace(place);

    const markerColor = form.type === 'government' ? '#dc2626' : '#2563eb';
    const marker = L.marker([place.lat, place.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-draggable-marker',
        html: `<div style="
          background: ${markerColor};
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="transform:rotate(45deg);color:white;font-size:16px;">📍</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
    }).addTo(mapInstance.current);

    marker.bindPopup(`<b>Draggable Custom Pin</b><br>Drag this pin to your exact hospital location.`).openPopup();
    markersRef.current.push(marker);

    marker.on('dragend', (e) => {
      const newPos = e.target.getLatLng();
      setSelectedPlace(prev => ({
        ...prev,
        lat: newPos.lat,
        lng: newPos.lng,
      }));
    });

    mapInstance.current.setView([place.lat, place.lng], 16);
  };

  const handleResultClick = (place) => {
    handlePlaceSelected(place);
    setSearchQuery(place.name);
  };

  // Form handlers
  const addWardRow = (type) => {
    setForm((f) => ({
      ...f,
      beds: { ...f.beds, [type]: [...f.beds[type], { count: '', wardName: '' }] },
    }));
  };

  const removeWardRow = (type, index) => {
    setForm((f) => ({
      ...f,
      beds: {
        ...f.beds,
        [type]: f.beds[type].filter((_, i) => i !== index),
      },
    }));
  };

  const setWard = (type, index, field, value) => {
    setForm((f) => {
      const rows = [...f.beds[type]];
      rows[index] = { ...rows[index], [field]: value };
      return { ...f, beds: { ...f.beds, [type]: rows } };
    });
  };

  const buildBedConfig = () => {
    const bedConfig = {};
    BED_TYPES.forEach((type) => {
      const valid = form.beds[type]
        .filter((w) => w.count && Number(w.count) > 0)
        .map((w) => ({ count: Number(w.count), wardName: w.wardName || `${type} Ward` }));
      if (valid.length) bedConfig[type] = valid;
    });
    return bedConfig;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlace) {
      setError('Please search and select your hospital from the map.');
      return;
    }

    if (!form.name.trim() || !form.city.trim()) {
      setError('Hospital name and city are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        type: form.type,
        description: form.description,
        city: form.city,
        address: form.address,
        phone: form.phone,
        adminEmail: form.adminEmail,
        password: form.password,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        dailyOPCapacity: Number(form.dailyOPCapacity),
        specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        bedConfig: buildBedConfig(),
        ambulance: form.addAmbulance ? form.ambulance : null,
        website: form.website || '',
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      images.forEach((file) => fd.append('images', file));

      await api.post('/auth/hospital/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { data } = await api.post('/auth/hospital/login', {
        email: form.adminEmail,
        password: form.password,
      });
      login(data.token, data.user);
      navigate('/hospital');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/login/hospital" className="text-green-600 text-sm mb-4 inline-block hover:underline">
          ← Back to Login
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Register Your Hospital</h1>
            <p className="text-green-100">
              Search for your hospital using OpenStreetMap to ensure authenticity and prevent duplicates.
            </p>
          </div>

          {/* Search Section */}
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search for your hospital (e.g., Manipal Hospital, Apollo)"
                      className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors text-gray-700"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </form>
              </div>
            </div>

            {geoLoading && (
              <p className="text-blue-600 text-sm mb-3">📍 Getting your location...</p>
            )}
            {location && !isFallback && (
              <p className="text-green-600 text-xs">
                ✓ Using your current location for nearby search
              </p>
            )}
            {isFallback && (
              <p className="text-amber-600 text-xs">
                ⚠️ Using default location. Enable GPS for better results.
              </p>
            )}

            {error && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 text-sm">{error}</p>
              </div>
            )}

            {/* OpenStreetMap Map */}
            <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200">
              <div ref={mapRef} className="h-80 w-full"></div>
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500 px-1">
              <span>
                {selectedPlace
                  ? `✓ Selected: ${selectedPlace.name}`
                  : 'Click a marker or search result to select your hospital'}
              </span>
              <button
                type="button"
                onClick={handleCreateCustomLocation}
                className="text-green-600 hover:text-green-700 font-semibold underline cursor-pointer"
              >
                Can't find it? Create Custom Location
              </button>
            </div>
          </div>


          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="p-6 bg-white border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-3">
                Found {searchResults.length} hospital(s) - Click to select
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {searchResults.map((place, idx) => {
                  const isSelected = selectedPlace?.placeId === place.placeId;
                  return (
                    <button
                      key={place.placeId}
                      onClick={() => handleResultClick(place)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-100 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{place.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{place.fullName}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">{place.type}</span>
                            {place.city && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{place.city}</span>}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-green-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Hospital Info */}
          {selectedPlace && (
            <div className="p-6 bg-green-50 border-b border-green-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-green-800">{selectedPlace.name}</h3>
                  <p className="text-green-700 text-sm mt-1">{selectedPlace.fullName}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Coordinates: {selectedPlace.lat.toFixed(6)}, {selectedPlace.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Hospital Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Hospital Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Hospital Name</label>
                  <input
                    required
                    placeholder="Enter or search hospital name"
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="private">Private</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
                    <input
                      required
                      placeholder="Enter city name"
                      className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  <input
                    placeholder="Enter full address"
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                    <input
                      placeholder="Enter phone"
                      className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Website</label>
                    <input
                      placeholder="Enter website"
                      className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Specialties (comma separated)</label>
                  <input
                    placeholder="Cardiology, Neurology, Orthopedics..."
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.specialties}
                    onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Tell patients about your hospital..."
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Hospital Images</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImages([...e.target.files])}
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Column - Admin & Beds */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Admin Login Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Admin Email</label>
                  <input
                    required
                    type="email"
                    placeholder="admin@hospital.com"
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Daily OP Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 rounded-lg border focus:border-green-500 focus:outline-none"
                    value={form.dailyOPCapacity}
                    onChange={(e) => setForm({ ...form, dailyOPCapacity: e.target.value })}
                  />
                </div>

                <h3 className="font-semibold text-gray-800 flex items-center gap-2 pt-4">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Beds Setup
                </h3>
                <p className="text-xs text-gray-500">Auto-creates beds with QR codes</p>

                {BED_TYPES.map((type) => (
                  <div key={type} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm capitalize font-medium text-gray-700">{type} beds</span>
                      <button
                        type="button"
                        onClick={() => addWardRow(type)}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        + Add ward
                      </button>
                    </div>
                    {form.beds[type].map((row, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="Count"
                          className="border rounded-lg px-3 py-2"
                          value={row.count}
                          onChange={(e) => setWard(type, idx, 'count', e.target.value)}
                        />
                        <input
                          placeholder="Ward Name"
                          className="border rounded-lg px-3 py-2 col-span-2"
                          value={row.wardName}
                          onChange={(e) => setWard(type, idx, 'wardName', e.target.value)}
                        />
                        {form.beds[type].length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWardRow(type, idx)}
                            className="col-span-3 text-xs text-red-500 text-left"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                <h3 className="font-semibold text-gray-800 flex items-center gap-2 pt-4">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  Ambulance (Optional)
                </h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.addAmbulance}
                    onChange={(e) => setForm({ ...form, addAmbulance: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Add ambulance and driver</span>
                </label>

                {form.addAmbulance && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      placeholder="Vehicle Number"
                      className="w-full px-4 py-2 rounded-lg border"
                      value={form.ambulance.vehicleNumber}
                      onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, vehicleNumber: e.target.value } })}
                    />
                    <input
                      placeholder="Driver Name"
                      className="w-full px-4 py-2 rounded-lg border"
                      value={form.ambulance.driverName}
                      onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverName: e.target.value } })}
                    />
                    <input
                      placeholder="Driver Email"
                      type="email"
                      className="w-full px-4 py-2 rounded-lg border"
                      value={form.ambulance.driverEmail}
                      onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverEmail: e.target.value } })}
                    />
                    <input
                      placeholder="Driver Password"
                      type="password"
                      className="w-full px-4 py-2 rounded-lg border"
                      value={form.ambulance.driverPassword}
                      onChange={(e) => setForm({ ...form, ambulance: { ...form.ambulance, driverPassword: e.target.value } })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100">
              {!selectedPlace && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800 text-sm">
                    ⚠️ Please search and select your hospital from the map above before registering.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedPlace}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Register Hospital'
                )}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                Your registration will be reviewed by a Super-Admin before appearing on the Patient Portal.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}