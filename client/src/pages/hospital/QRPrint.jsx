import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

export default function QRPrint() {
  const [beds, setBeds] = useState([]);
  const [wardFilter, setWardFilter] = useState('all');

  useEffect(() => {
    api.get('/hospital/beds').then((r) => setBeds(r.data));
  }, []);

  const wards = ['all', ...new Set(beds.map((b) => b.wardName))];
  const filtered = wardFilter === 'all' ? beds : beds.filter((b) => b.wardName === wardFilter);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-5xl mx-auto px-4 py-8 print:p-4">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6 print:hidden">
          <h1 className="text-2xl font-bold">Print Bed QR Codes</h1>
          <div className="flex gap-2">
            <select className="border rounded-lg px-3 py-2" value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}>
              {wards.map((w) => (
                <option key={w} value={w}>{w === 'all' ? 'All Wards' : w}</option>
              ))}
            </select>
            <button onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Print QR Codes
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6 print:hidden">
          Stick printed QR codes on each bed frame. Nurses scan them from Hospital Portal → Scan QR on mobile.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
          {filtered.map((bed) => (
            <div key={bed._id}
              className="bg-white border rounded-lg p-4 text-center break-inside-avoid print:border-2 print:p-6">
              {bed.qrCode && (
                <img src={bed.qrCode} alt="QR" className="w-32 h-32 mx-auto mb-2 print:w-40 print:h-40" />
              )}
              <p className="font-bold text-lg">{bed.bedNumber}</p>
              <p className="text-sm text-gray-600">{bed.wardName}</p>
              <p className="text-xs text-gray-400 capitalize">{bed.type} bed</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-12">No beds found. Add beds from Bed Management first.</p>
        )}
      </div>

      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
