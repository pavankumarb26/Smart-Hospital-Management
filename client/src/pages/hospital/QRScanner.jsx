import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [bed, setBed] = useState(null);
  const scannerRef = useRef(null);

  const startScan = async () => {
    setScanning(true);
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      async (decoded) => {
        try {
          const data = JSON.parse(decoded);
          const { data: bedData } = await api.get(`/hospital/beds`);
          const found = bedData.find((b) => b._id === data.bedId);
          if (found) {
            await scanner.stop();
            setScanning(false);
            setBed(found);
          }
        } catch {
          console.error('Invalid QR');
        }
      }
    );
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const updateStatus = async (status) => {
    await api.patch(`/hospital/beds/${bed._id}/status`, { status });
    setBed({ ...bed, status });
  };

  useEffect(() => () => { stopScan(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Scan Bed QR</h1>

        {!bed && !scanning && (
          <button
            onClick={startScan}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Start Camera Scanner
          </button>
        )}

        {scanning && (
          <>
            <div id="qr-reader" className="rounded-xl overflow-hidden mb-4" />
            <button onClick={stopScan} className="w-full text-red-600 py-2">Stop Scanner</button>
          </>
        )}

        {bed && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-1">{bed.bedNumber}</h2>
            <p className="text-gray-500 mb-3">{bed.wardName}</p>
            <StatusBadge status={bed.status} />
            <p className="text-sm text-gray-400 capitalize mt-2 mb-4">{bed.type} bed</p>
            <div className="grid grid-cols-2 gap-2">
              {['available', 'occupied', 'cleaning', 'maintenance'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`py-2 rounded-lg text-sm capitalize ${
                    bed.status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => setBed(null)} className="mt-4 text-sm text-blue-600 w-full">
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
