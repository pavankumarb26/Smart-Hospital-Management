const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/authMiddleware');
const {
  bookOP,
  createBedRequest,
  getMyBedRequests,
  getAvailableAmbulances,
  createAmbulanceRequest,
  getActiveAmbulanceRequest,
} = require('../controllers/patientController');

const router = express.Router();
const ambulanceLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.use(auth(['patient']));

router.post('/op-bookings', bookOP);
router.post('/bed-requests', createBedRequest);
router.get('/bed-requests/mine', getMyBedRequests);
router.post('/ambulance-requests/nearby', getAvailableAmbulances);
router.post('/ambulance-requests', ambulanceLimiter, createAmbulanceRequest);
router.get('/ambulance-requests/active', getActiveAmbulanceRequest);

module.exports = router;
