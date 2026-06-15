const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  getDashboard,
  getBeds,
  createBed,
  updateBedStatus,
  getBedRequests,
  approveBedRequest,
  rejectBedRequest,
  getAmbulances,
  updateSettings,
} = require('../controllers/hospitalAdminController');

const router = express.Router();

router.use(auth(['hospital']));

router.get('/dashboard', getDashboard);
router.get('/beds', getBeds);
router.post('/beds', createBed);
router.patch('/beds/:id/status', updateBedStatus);
router.get('/bed-requests', getBedRequests);
router.patch('/bed-requests/:id/approve', approveBedRequest);
router.patch('/bed-requests/:id/reject', rejectBedRequest);
router.get('/ambulances', getAmbulances);
router.patch('/settings', updateSettings);

module.exports = router;
