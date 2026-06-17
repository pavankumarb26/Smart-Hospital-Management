import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { imageUrl } from '../../utils/imageUrl';

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('pending');

  const fetchData = () => {
    api.get('/admin/hospitals/pending').then((r) => setPending(r.data));
    api.get('/admin/hospitals').then((r) => setAll(r.data));
  };

  useEffect(() => { fetchData(); }, []);

  const approve = async (id) => {
    await api.patch(`/admin/hospitals/${id}/approve`);
    fetchData();
  };

  const reject = async (id) => {
    await api.patch(`/admin/hospitals/${id}/reject`);
    fetchData();
  };

  const list = tab === 'pending' ? pending : all;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-700">Super-Admin</h1>
        <Link to="/" className="text-sm text-gray-500">Home</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'pending' ? 'bg-purple-600 text-white' : 'bg-white border'}`}>
            Pending ({pending.length})
          </button>
          <button onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'all' ? 'bg-purple-600 text-white' : 'bg-white border'}`}>
            All Hospitals
          </button>
        </div>

        {list.length === 0 ? (
          <p className="text-gray-500">No hospitals in this list.</p>
        ) : (
          <div className="space-y-4">
            {list.map((h) => (
              <div key={h._id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex gap-4">
                  {h.images?.[0] && (
                    <img src={imageUrl(h.images[0])} alt="" className="w-24 h-24 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{h.name}</h3>
                    <p className="text-sm text-gray-500">{h.city} &middot; {h.type} &middot; {h.adminEmail}</p>
                    <p className="text-sm text-gray-600 mt-1">{h.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Beds: {h.totalBeds} normal, {h.totalICU} ICU, {h.totalEmergency} emergency, {h.totalVentilators} ventilators
                    </p>
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize ${
                      h.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                      h.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>{h.approvalStatus}</span>
                  </div>
                </div>
                {h.approvalStatus === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => approve(h._id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => reject(h._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
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
