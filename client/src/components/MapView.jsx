import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function MapView({
  center,
  markers = [],
  className = 'h-64 w-full rounded-lg',
  draggableMarker = false,
  onLocationChange,
  onMarkerClick,
  selectedMarkerIndex,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRefs = useRef([]);

  const leafletMapRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  // Dynamically load Leaflet if no Google Maps key is provided
  useEffect(() => {
    if (key) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      setLeafletLoaded(true);
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    }
  }, [key]);

  // Leaflet Map Initialization and updates
  useEffect(() => {
    if (key || !leafletLoaded || !mapRef.current) return;

    const L = window.L;
    const latLng = center || { lat: 12.9716, lng: 77.5946 };

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([latLng.lat, latLng.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(leafletMapRef.current);
    } else if (center) {
      leafletMapRef.current.setView([center.lat, center.lng]);
    }
  }, [leafletLoaded, center, key]);

  // Leaflet Markers and Dragging Support
  useEffect(() => {
    if (key || !leafletLoaded || !leafletMapRef.current) return;

    const L = window.L;
    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    if (!markers.length) return;

    const bounds = [];
    leafletMarkersRef.current = markers.map((m, index) => {
      const isDraggable = draggableMarker && index === 0;
      const isSelected = index === selectedMarkerIndex;

      const markerIcon = L.divIcon({
        className: '',
        html: `<div style="
          background: ${isSelected ? '#22c55e' : m.icon?.url ? 'transparent' : '#3b82f6'};
          width: ${isSelected ? '40px' : '32px'};
          height: ${isSelected ? '40px' : '32px'};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${m.icon?.url
            ? `<img src="${m.icon.url}" style="width:20px;height:20px;transform:rotate(45deg);border-radius:50%;" />`
            : `<span style="transform:rotate(45deg);color:white;font-size:12px;font-weight:bold;">${isSelected ? '✓' : (index + 1)}</span>`
          }
        </div>`,
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
      });

      const marker = L.marker([m.lat, m.lng], {
        draggable: isDraggable,
        icon: markerIcon,
      }).addTo(leafletMapRef.current);

      if (m.title) {
        marker.bindPopup(`<b>${m.title}</b>`);
      }

      if (isSelected) {
        marker.openPopup();
      }

      bounds.push([m.lat, m.lng]);

      if (isDraggable && onLocationChange) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onLocationChange({ lat: newPos.lat, lng: newPos.lng });
        });
      }

      if (onMarkerClick && index > 0) {
        marker.on('click', () => onMarkerClick(m, index));
      }

      return marker;
    });

    if (bounds.length > 1) {
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [leafletLoaded, markers, draggableMarker, onLocationChange, onMarkerClick, selectedMarkerIndex, key]);

  // Google Maps Initialization and updates
  useEffect(() => {
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
      } else if (center) {
        mapInstance.current.setCenter(center);
      }
    });
  }, [center, key]);

  // Google Maps Markers and Dragging Support
  useEffect(() => {
    if (!key || !mapInstance.current || !window.google) return;

    markerRefs.current.forEach((m) => m.setMap(null));
    const bounds = new google.maps.LatLngBounds();

    markerRefs.current = markers.map((m, index) => {
      const isDraggable = draggableMarker && index === 0;
      const isSelected = index === selectedMarkerIndex;

      let icon = m.icon;
      if (!icon && isSelected) {
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        };
      }

      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstance.current,
        title: m.title || '',
        icon: icon || undefined,
        draggable: isDraggable,
      });

      bounds.extend(marker.getPosition());

      if (isDraggable && onLocationChange) {
        google.maps.event.addListener(marker, 'dragend', () => {
          const lat = marker.getPosition().lat();
          const lng = marker.getPosition().lng();
          onLocationChange({ lat, lng });
        });
      }

      if (m.title) {
        const infowindow = new google.maps.InfoWindow({
          content: `<b>${m.title}</b>`,
        });
        marker.addListener('click', () => {
          infowindow.open(mapInstance.current, marker);
          if (onMarkerClick && index > 0) {
            onMarkerClick(m, index);
          }
        });
      }

      return marker;
    });

    if (markers.length > 1) {
      mapInstance.current.fitBounds(bounds);
    }
  }, [markers, draggableMarker, onLocationChange, onMarkerClick, selectedMarkerIndex, key]);

  return <div ref={mapRef} className={className} style={{ position: 'relative', overflow: 'hidden' }} />;
}

