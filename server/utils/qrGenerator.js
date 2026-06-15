const QRCode = require('qrcode');

const generateBedQR = async (bedId, hospitalId) => {
  const payload = JSON.stringify({ bedId: bedId.toString(), hospitalId: hospitalId.toString() });
  const base64 = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
  return base64;
};

module.exports = { generateBedQR };
