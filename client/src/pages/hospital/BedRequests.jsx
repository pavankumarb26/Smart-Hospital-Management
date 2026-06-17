import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { useSocketContext } from '../../context/SocketContext';
import api from '../../services/api';

export default function BedRequests() {
  const [requests, setRequests] = useState([]);
  const { subscribe } = useSocketContext();

  const fetchRequests = () => api.get('/hospital/bed-requests').then((r) => setRequests(r.data));

  useEffect(() => {
    fetchRequests();
    const unsub1 = subscribe('bedRequest:new', fetchRequests);
    const unsub2 = subscribe('ambulance:priorityAlert', fetchRequests);
    return () => { unsub1(); unsub2(); };
  }, []);

  const approve = async (id) => {
    try {
      await api.patch(`/hospital/bed-requests/${id}/approve`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  const reject = async (id) => {
    await api.patch(`/hospital/bed-requests/${id}/reject`);
    fetchRequests();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Bed Requests</h1>
        {requests.length === 0 ? (
          <p className="text-gray-500">No requests</p>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r._id} className={`bg-white rounded-xl p-5 shadow-sm ${r.priority === 'emergency' ? 'border-2 border-red-300' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{r.patientName}</h3>
                    <p className="text-sm text-gray-500">Age {r.patientAge} &middot; {r.bedType} bed</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.priority === 'emergency' && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">EMERGENCY</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{r.problemDescription}</p>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(r._id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(r._id)}
                      className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
