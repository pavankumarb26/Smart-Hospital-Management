/**
 * Straight-line distance in km.
 * @param {number} userLatitude
 * @param {number} userLongitude
 * @param {number} hospitalLatitude
 * @param {number} hospitalLongitude
 */
const calculateDistance = (userLatitude, userLongitude, hospitalLatitude, hospitalLongitude) => {
  const dLat = (hospitalLatitude - userLatitude) * Math.PI / 180;
  const dLng = (hospitalLongitude - userLongitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(userLatitude * Math.PI / 180) *
    Math.cos(hospitalLatitude * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** GeoJSON Point coordinates are [longitude, latitude] */
const parseHospitalCoords = (location) => {
  const coords = location?.coordinates;
  if (!coords || coords.length < 2) return { latitude: null, longitude: null };
  return { longitude: coords[0], latitude: coords[1] };
};

const isBangaloreCoords = (latitude, longitude) =>
  latitude > 12 && latitude < 13.5 && longitude > 77 && longitude < 78;

module.exports = { calculateDistance, parseHospitalCoords, isBangaloreCoords };
