import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Smart Hospital Bed &amp; Ambulance Management
        </h1>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Find available hospital beds in real time, book outpatient appointments,
          and request ambulances with live GPS tracking.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Link
            to="/login/patient"
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-blue-100"
          >
            <div className="text-4xl mb-4">🏥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient Portal</h2>
            <p className="text-gray-500 text-sm">
              Search hospitals, book OP slots, request beds &amp; ambulances
            </p>
          </Link>

          <Link
            to="/login/hospital"
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-green-100"
          >
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Hospital Portal</h2>
            <p className="text-gray-500 text-sm">
              Manage beds, QR scanning, patient requests &amp; fleet
            </p>
          </Link>

          <Link
            to="/login/driver"
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-orange-100"
          >
            <div className="text-4xl mb-4">🚑</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Driver Portal</h2>
            <p className="text-gray-500 text-sm">
              Accept rides, share GPS location, navigate to patients
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
