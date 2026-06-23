import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

function parseQrPayload(decodedText) {
  console.log('[qr-scan] raw scanned value:', decodedText);
  try {
    const data = JSON.parse(decodedText);
    if (!data.bedId) throw new Error('QR missing bedId');
    console.log('[qr-scan] parsed payload:', data);
    return data;
  } catch {
    throw new Error('Invalid QR format. Expected JSON with bedId and hospitalId.');
  }
}

async function pickCameraId() {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) return { facingMode: 'user' };

    const back = cameras.find((c) =>
      /back|rear|environment|wide/i.test(c.label)
    );
    return back?.id || cameras[cameras.length - 1].id;
  } catch {
    return { facingMode: 'user' };
  }
}

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [bed, setBed] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);
  const fileInputRef = useRef(null);

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* already stopped */
      }
      try {
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
    scannedRef.current = false;
  }, []);

  const processQrText = useCallback(async (decodedText) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = parseQrPayload(decodedText);
      const { data } = await api.post('/hospital/beds/scan', payload);
      await stopScan();
      setBed(data);
      setSuccess(`Bed ${data.bedNumber} (${data.wardName}) loaded. Select a status below.`);
    } catch (err) {
      scannedRef.current = false;
      const msg = err.response?.data?.message || err.message || 'Failed to read QR code';
      setError(msg);
      console.error('[qr-scan] error:', msg);
    } finally {
      setLoading(false);
    }
  }, [stopScan]);

  const startScan = () => {
    setError('');
    setSuccess('');
    setBed(null);
    scannedRef.current = false;

    if (!window.isSecureContext) {
      setError(
        'Camera blocked: open the app at http://localhost:5173 (not 127.0.0.1 or your IP address). ' +
        'Or use "Upload QR Image" below instead.'
      );
      return;
    }

    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return undefined;

    let cancelled = false;

    const bootCamera = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      if (cancelled) return;

      const el = document.getElementById('qr-reader');
      if (!el) {
        setError('Scanner failed to load. Please try again.');
        setScanning(false);
        return;
      }

      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        const cameraId = await pickCameraId();

        await scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (text) => { if (!cancelled) processQrText(text); },
          () => {}
        );
      } catch (err) {
        console.error('[qr-scan] camera error:', err);
        if (!cancelled) {
          const name = err?.name || '';
          if (name === 'NotAllowedError' || /permission/i.test(err.message)) {
            setError('Camera permission denied. Click the lock icon in the browser address bar and allow Camera, then try again.');
          } else if (name === 'NotFoundError') {
            setError('No camera found on this device. Use "Upload QR Image" to scan from a photo.');
          } else {
            setError(err.message || 'Could not start camera. Try Upload QR Image instead.');
          }
          setScanning(false);
          scannerRef.current = null;
        }
      }
    };

    bootCamera();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
    };
  }, [scanning, processQrText]);

  const scanFromFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    setBed(null);
    scannedRef.current = false;
    setLoading(true);

    try {
      const scanner = new Html5Qrcode('qr-reader-hidden');
      const text = await scanner.scanFile(file, true);
      await scanner.clear();
      await processQrText(text);
    } catch (err) {
      setError(err.message || 'Could not read QR from image. Use a clear photo of the QR code.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateStatus = async (status) => {
    if (!bed) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.patch(`/hospital/beds/${bed._id}/status`, { status });
      setBed(data);
      setSuccess(`Bed ${data.bedNumber} marked as ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update bed status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar portal="hospital" />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Scan Bed QR</h1>
        <p className="text-sm text-gray-500 mb-4">
          Scan the QR sticker on the bed frame, then update status.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Camera works on <strong>http://localhost:5173</strong> only. If using phone, connect via USB debug or use Upload QR Image.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {/* Always in DOM so html5-qrcode can mount; hidden when not scanning */}
        <div
          id="qr-reader"
          className={`rounded-xl overflow-hidden mb-4 ${scanning ? 'block' : 'hidden'}`}
          style={{ minHeight: scanning ? 300 : 0 }}
        />
        <div id="qr-reader-hidden" className="hidden" />

        {!bed && !scanning && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startScan}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Start Camera Scanner
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              Upload QR Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={scanFromFile}
            />
          </div>
        )}

        {scanning && (
          <>
            <p className="text-sm text-gray-500 text-center mb-2">Point camera at bed QR code</p>
            <button type="button" onClick={stopScan} className="w-full text-red-600 py-2 mb-3">
              Stop Scanner
            </button>
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
                  type="button"
                  disabled={loading}
                  onClick={() => updateStatus(s)}
                  className={`py-2 rounded-lg text-sm capitalize disabled:opacity-50 ${
                    bed.status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setBed(null); setSuccess(''); setError(''); }}
              className="mt-4 text-sm text-blue-600 w-full"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
