import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import PatientLogin from './pages/auth/PatientLogin';
import HospitalLogin from './pages/auth/HospitalLogin';
import HospitalRegister from './pages/auth/HospitalRegister';
import DriverLogin from './pages/auth/DriverLogin';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import HospitalList from './pages/patient/HospitalList';
import HospitalDetail from './pages/patient/HospitalDetail';
import BedRequest from './pages/patient/BedRequest';
import MyBedRequests from './pages/patient/MyBedRequests';
import AmbulanceTracking from './pages/patient/AmbulanceTracking';
import Dashboard from './pages/hospital/Dashboard';
import BedManagement from './pages/hospital/BedManagement';
import QRScanner from './pages/hospital/QRScanner';
import BedRequests from './pages/hospital/BedRequests';
import AmbulanceFleet from './pages/hospital/AmbulanceFleet';
import OPManagement from './pages/hospital/OPManagement';
import QRPrint from './pages/hospital/QRPrint';
import DriverHome from './pages/driver/DriverHome';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login/patient" element={<PatientLogin />} />
            <Route path="/login/hospital" element={<HospitalLogin />} />
            <Route path="/register/hospital" element={<HospitalRegister />} />
            <Route path="/login/driver" element={<DriverLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />

            <Route path="/patient" element={<ProtectedRoute role="patient"><HospitalList /></ProtectedRoute>} />
            <Route path="/patient/hospital/:id" element={<ProtectedRoute role="patient"><HospitalDetail /></ProtectedRoute>} />
            <Route path="/patient/bed-request/:hospitalId" element={<ProtectedRoute role="patient"><BedRequest /></ProtectedRoute>} />
            <Route path="/patient/bed-requests" element={<ProtectedRoute role="patient"><MyBedRequests /></ProtectedRoute>} />
            <Route path="/patient/ambulance" element={<ProtectedRoute role="patient"><AmbulanceTracking /></ProtectedRoute>} />

            <Route path="/hospital" element={<ProtectedRoute role="hospital"><Dashboard /></ProtectedRoute>} />
            <Route path="/hospital/beds" element={<ProtectedRoute role="hospital"><BedManagement /></ProtectedRoute>} />
            <Route path="/hospital/print-qr" element={<ProtectedRoute role="hospital"><QRPrint /></ProtectedRoute>} />
            <Route path="/hospital/scan" element={<ProtectedRoute role="hospital"><QRScanner /></ProtectedRoute>} />
            <Route path="/hospital/requests" element={<ProtectedRoute role="hospital"><BedRequests /></ProtectedRoute>} />
            <Route path="/hospital/ambulances" element={<ProtectedRoute role="hospital"><AmbulanceFleet /></ProtectedRoute>} />
            <Route path="/hospital/settings" element={<ProtectedRoute role="hospital"><OPManagement /></ProtectedRoute>} />

            <Route path="/driver" element={<ProtectedRoute role="driver"><DriverHome /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
