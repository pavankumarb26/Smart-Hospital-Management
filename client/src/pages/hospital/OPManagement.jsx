import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import { imageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';

export default function OPManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [images, setImages] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    api.get('/hospital/profile').then((r) => {
      setProfile(r.data);
      setForm({
        name: r.data.name,
        description: r.data.description || '',
        phone: r.data.phone || '',
        address: r.data.address || '',
        city: r.data.city || '',
        dailyOPCapacity: r.data.dailyOPCapacity,
        specialties: (r.data.specialties || []).join(', '),
      });
    });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    try {
      const fd = new FormData();
      fd.append('data', JSON.stringify({
        ...form,
        dailyOPCapacity: Number(form.dailyOPCapacity),
      }));
      images.forEach((f) => fd.append('images', f));
      await api.patch('/hospital/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaved(true);
      setImages([]);
      load();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const resubmit = async () => {
    await api.post('/hospital/resubmit');
    load();
    alert('Profile resubmitted for Super-Admin approval.');
  };

  const deleteHospital = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('Type DELETE exactly to confirm');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await api.delete('/hospital/account', { data: { confirmText: deleteConfirm } });
      logout();
      navigate('/');
      alert('Hospital deleted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete hospital');
    } finally {
      setDeleting(false);
    }
  };

  if (!profile) return <p className="p-8">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hospital Settings</h1>

        {profile.approvalStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="mb-2">Your registration was rejected. Update details below and resubmit.</p>
            <button onClick={resubmit} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
              Resubmit for Approval
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">
          GPS location is locked after registration. Contact Super-Admin to change location.
        </p>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 mb-8">
          <input className="w-full border rounded-lg px-4 py-2" placeholder="Hospital Name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="w-full border rounded-lg px-4 py-2" rows={3} placeholder="Description"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="w-full border rounded-lg px-4 py-2" placeholder="Phone"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full border rounded-lg px-4 py-2" placeholder="Address"
            value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="w-full border rounded-lg px-4 py-2" placeholder="City"
            value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="w-full border rounded-lg px-4 py-2" placeholder="Specialties (comma separated)"
            value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
          <input type="number" min={1} className="w-full border rounded-lg px-4 py-2" placeholder="Daily OP Capacity"
            value={form.dailyOPCapacity} onChange={(e) => setForm({ ...form, dailyOPCapacity: e.target.value })} />
          <input type="file" accept="image/*" multiple onChange={(e) => setImages([...e.target.files])}
            className="w-full border rounded-lg px-4 py-2" />

          {profile.images?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {profile.images.map((img, i) => (
                <img key={i} src={imageUrl(img)} alt="" className="w-16 h-16 object-cover rounded" />
              ))}
            </div>
          )}

          <button onClick={save} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            Save Profile
          </button>
          {saved && <p className="text-green-600 text-sm text-center">Saved!</p>}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="font-semibold text-red-800 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-700 mb-4">
            Permanently delete your hospital and all beds, QR codes, ambulances, drivers, and requests.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            Delete Hospital
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-red-700 mb-3">Are you sure?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5 mb-4 space-y-1">
              <li>Hospital profile</li>
              <li>All beds &amp; QR codes</li>
              <li>Ambulances &amp; drivers</li>
              <li>Bed requests &amp; OP bookings</li>
            </ul>
            <p className="text-sm font-medium mb-2">Type <strong>DELETE</strong> to continue:</p>
            <input
              className="w-full border rounded-lg px-4 py-2 mb-4"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 border rounded-lg py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteHospital}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
