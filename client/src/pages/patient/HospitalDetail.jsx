import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import MapView from '../../components/MapView';
import { imageUrl } from '../../utils/imageUrl';
import api from '../../services/api';

export default function HospitalDetail() {
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [resources, setResources] = useState(null);
  const [opStatus, setOpStatus] = useState(null);
  const [booking, setBooking] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/hospitals/${id}`).then((r) => setHospital(r.data));
    api.get(`/hospitals/${id}/resources`).then((r) => setResources(r.data));
    api.get(`/hospitals/${id}/op-status`).then((r) => setOpStatus(r.data));
  }, [id]);

  const bookOP = async () => {
    setError('');
    setBooking(true);
    try {
      const { data } = await api.post('/op-bookings', { hospitalId: id });
      setToken(data.booking.tokenNumber);
      setOpStatus((s) => ({ ...s, booked: s.booked + 1, remaining: s.remaining - 1 }));
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (!hospital) return <p className="p-8">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/patient" className="text-blue-600 text-sm mb-4 inline-block">&larr; Back</Link>

        {hospital.images?.[0] && (
          <img src={imageUrl(hospital.images[0])} alt={hospital.name} className="w-full h-48 object-cover rounded-xl mb-6" />
        )}

        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">{hospital.name}</h1>
          <StatusBadge status={hospital.type === 'government' ? 'available' : 'busy'} />
        </div>
        <p className="text-gray-600 mb-4 capitalize">{hospital.type} Hospital · {hospital.city}</p>
        <p className="text-gray-700 mb-6">{hospital.description}</p>

        {hospital.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {hospital.specialties.map((s) => (
              <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{s}</span>
            ))}
          </div>
        )}

        {hospital.latitude && hospital.longitude && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Location & Directions</h2>
            <MapView
              center={{ lat: hospital.latitude, lng: hospital.longitude }}
              markers={[{ lat: hospital.latitude, lng: hospital.longitude, title: hospital.name }]}
              className="h-64 w-full rounded-xl mb-3"
            />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              📍 Navigate in Google Maps &rarr;
            </a>
          </div>
        )}

        {resources && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-semibold mb-4">Live Resources</h2>
            <div className="grid grid-cols-2 gap-4">
              {['normal', 'icu', 'emergency', 'ventilator'].map((type) => (
                <div key={type} className="border rounded-lg p-3">
                  <p className="text-sm text-gray-500 capitalize">{type}</p>
                  <p className="text-lg font-bold">
                    {resources.available[type] || 0}
                    <span className="text-sm text-gray-400 font-normal"> / {resources.total[type] || 0}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {opStatus && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-semibold mb-2">Outpatient Booking</h2>
            <p className="text-sm text-gray-500 mb-4">
              {opStatus.booked} / {opStatus.capacity} slots booked today
            </p>
            {token ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700">Your token number</p>
                <p className="text-3xl font-bold text-green-800">{token}</p>
              </div>
            ) : opStatus.remaining > 0 ? (
              <button
                onClick={bookOP}
                disabled={booking}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {booking ? 'Booking...' : 'Book OP Appointment'}
              </button>
            ) : (
              <p className="text-red-600 font-medium">Fully Booked for Today</p>
            )}
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            to={`/patient/bed-request/${id}`}
            className="flex-1 text-center bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
          >
            Request Bed
          </Link>
          <Link
            to={`/patient/ambulance?hospitalId=${id}`}
            className="flex-1 text-center bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700"
          >
            Request Ambulance
          </Link>
        </div>
      </div>
    </div>
  );
}
