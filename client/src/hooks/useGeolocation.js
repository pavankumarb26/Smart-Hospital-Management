import { useState, useEffect, useCallback } from 'react';

const FALLBACK = { lat: 12.9716, lng: 77.5946, label: 'Bangalore (demo fallback)' };

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const applyPosition = useCallback((pos, fallback = false) => {
    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setIsFallback(fallback);
    setError(fallback ? 'Using demo location — allow GPS for accurate distance' : null);
    setLoading(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      setLocation(FALLBACK);
      setIsFallback(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos, false),
      (err) => {
        setError(err.message || 'Could not get GPS location');
        setLocation(FALLBACK);
        setIsFallback(true);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [applyPosition]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, error, loading, isFallback, refreshLocation: requestLocation };
}
