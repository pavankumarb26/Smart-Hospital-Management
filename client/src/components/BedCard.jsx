import StatusBadge from './StatusBadge';

export default function BedCard({ bed, onStatusChange, showQR }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-gray-900">{bed.bedNumber}</p>
          <p className="text-sm text-gray-500">{bed.wardName}</p>
        </div>
        <StatusBadge status={bed.status} />
      </div>
      <p className="text-xs text-gray-400 capitalize mb-3">{bed.type} bed</p>
      {showQR && bed.qrCode && (
        <img src={bed.qrCode} alt="QR Code" className="w-24 h-24 mx-auto mb-2" />
      )}
      {onStatusChange && (
        <div className="grid grid-cols-2 gap-1 mt-2">
          {['available', 'occupied', 'cleaning', 'maintenance'].map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(bed._id, s)}
              className="text-xs px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 capitalize"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
