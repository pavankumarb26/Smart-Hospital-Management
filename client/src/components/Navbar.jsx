import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ portal }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const links = {
    patient: [
      { to: '/patient', label: 'Hospitals' },
      { to: '/patient/bed-requests', label: 'My Requests' },
      { to: '/patient/ambulance', label: 'Ambulance' },
    ],
    hospital: [
      { to: '/hospital', label: 'Dashboard' },
      { to: '/hospital/beds', label: 'Beds' },
      { to: '/hospital/requests', label: 'Requests' },
      { to: '/hospital/scan', label: 'Scan QR' },
      { to: '/hospital/ambulances', label: 'Fleet' },
      { to: '/hospital/settings', label: 'Settings' },
    ],
    driver: [
      { to: '/driver', label: 'Home' },
    ],
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">
          SmartCare
        </Link>
        <div className="flex items-center gap-4">
          {(links[portal] || []).map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-gray-600 hover:text-blue-600">
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="text-sm text-gray-500">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
