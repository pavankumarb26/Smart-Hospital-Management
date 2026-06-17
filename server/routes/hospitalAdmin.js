const express = require('express');
const auth = require('../middleware/authMiddleware');
const upload = require('../config/upload');
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
  getProfile,
  addMoreBeds,
  updateProfile,
  resubmitForApproval,
  createFleet,
} = require('../controllers/hospitalAdminController');

const router = express.Router();

router.use(auth(['hospital']));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.patch('/profile', upload.array('images', 5), updateProfile);
router.post('/resubmit', resubmitForApproval);
router.get('/beds', getBeds);
router.post('/beds', createBed);
router.post('/beds/batch', addMoreBeds);
router.patch('/beds/:id/status', updateBedStatus);
router.get('/bed-requests', getBedRequests);
router.patch('/bed-requests/:id/approve', approveBedRequest);
router.patch('/bed-requests/:id/reject', rejectBedRequest);
router.get('/ambulances', getAmbulances);
router.post('/fleet', createFleet);
router.patch('/settings', updateSettings);

module.exports = router;
