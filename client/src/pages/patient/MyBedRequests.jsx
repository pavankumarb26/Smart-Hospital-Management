import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function MyBedRequests() {
  const [requests, setRequests] = useState([]);
  const { subscribe } = useSocketContext();

  const fetchRequests = () => {
    api.get('/bed-requests/mine').then((r) => setRequests(r.data));
  };

  useEffect(() => {
    fetchRequests();
    const unsub = subscribe('bedRequest:statusChanged', () => fetchRequests());
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="patient" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Bed Requests</h1>
        {requests.length === 0 ? (
          <p className="text-gray-500">No bed requests yet</p>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r._id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{r.hospitalId?.name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-600">{r.problemDescription}</p>
                <p className="text-xs text-gray-400 mt-2 capitalize">
                  {r.bedType} bed &middot; {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.assignedBedId && (
                  <p className="text-sm text-green-700 mt-2 font-medium">
                    Assigned: {r.assignedBedId.wardName} - {r.assignedBedId.bedNumber}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
