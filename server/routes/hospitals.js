const express = require('express');
const {
  getNearbyHospitals,
  getCities,
  getHospitalById,
  getHospitalResources,
  getOPStatus,
  searchHospitalsByName,
} = require('../controllers/hospitalController');

const router = express.Router();

router.get('/nearby', getNearbyHospitals);
router.get('/cities', getCities);
router.get('/search', searchHospitalsByName);
router.get('/:id/resources', getHospitalResources);
router.get('/:id/op-status', getOPStatus);
router.get('/:id', getHospitalById);

module.exports = router;
