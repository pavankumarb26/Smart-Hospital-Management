const express = require('express');
const {
  getNearbyHospitals,
  getHospitalById,
  getHospitalResources,
  getOPStatus,
} = require('../controllers/hospitalController');

const router = express.Router();

router.get('/nearby', getNearbyHospitals);
router.get('/:id', getHospitalById);
router.get('/:id/resources', getHospitalResources);
router.get('/:id/op-status', getOPStatus);

module.exports = router;
