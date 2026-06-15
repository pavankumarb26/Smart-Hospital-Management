import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function MapView({ center, markers = [], className = 'h-64 w-full rounded-lg' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRefs = useRef([]);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key || !mapRef.current) return;

    const loader = new Loader({ apiKey: key, version: 'weekly' });

    loader.load().then(() => {
      if (!mapInstance.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: center || { lat: 12.9716, lng: 77.5946 },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
        });
      } else {
        mapInstance.current.setCenter(center);
      }
    });
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = markers.map((m) => {
      return new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstance.current,
        title: m.title || '',
        icon: m.icon,
      });
    });
  }, [markers]);

  if (!import.meta.env.VITE_GOOGLE_MAPS_KEY) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-500 text-sm`}>
        Add VITE_GOOGLE_MAPS_KEY to enable maps
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
