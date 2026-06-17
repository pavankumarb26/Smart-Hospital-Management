import { Link } from 'react-router-dom';

export default function HospitalCard({ hospital }) {
  const { available = {} } = hospital;

  return (
    <Link
      to={`/patient/hospital/${hospital._id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{hospital.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
          hospital.type === 'government' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {hospital.type}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-1 capitalize">{hospital.type} Hospital · {hospital.city}</p>
      {hospital.distance != null && (
        <p className="text-sm text-blue-600 font-medium mb-3">
          {hospital.distance} km away <span className="text-gray-400 font-normal">(straight-line)</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-green-50 rounded-lg p-2">
          <p className="font-bold text-green-700">{available.normal || 0}</p>
          <p className="text-xs text-gray-500">Beds</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="font-bold text-blue-700">{available.icu || 0}</p>
          <p className="text-xs text-gray-500">ICU</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2">
          <p className="font-bold text-purple-700">{available.ventilator || 0}</p>
          <p className="text-xs text-gray-500">Ventilators</p>
        </div>
      </div>
    </Link>
  );
}
