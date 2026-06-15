import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import HospitalCard from '../../components/HospitalCard';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

export default function HospitalList() {
  const { location, loading: geoLoading } = useGeolocation();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHospitals = async () => {
    if (!location) return;
    try {
      const { data } = await api.get('/hospitals/nearby', {
        params: { lat: location.lat, lng: location.lng },
      });
      setHospitals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    const interval = setInterval(fetchHospitals, 60000);
    return () => clearInterval(interval);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Nearby Hospitals</h1>
        <p className="text-gray-500 mb-6">Live bed availability near your location</p>

        {(geoLoading || loading) && (
          <p className="text-gray-500">Loading hospitals...</p>
        )}

        <div className="grid gap-4">
          {hospitals.map((h) => (
            <HospitalCard key={h._id} hospital={h} />
          ))}
        </div>

        {!loading && hospitals.length === 0 && (
          <p className="text-gray-500 text-center py-12">No hospitals found nearby</p>
        )}
      </div>
    </div>
  );
}
