const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  getProfile,
  updateStatus,
  acceptRequest,
  rejectRequest,
  markPickup,
  markComplete,
} = require('../controllers/driverController');

const router = express.Router();

router.use(auth(['driver']));

router.get('/profile', getProfile);
router.patch('/status', updateStatus);
router.patch('/ambulance-requests/:id/accept', acceptRequest);
router.patch('/ambulance-requests/:id/reject', rejectRequest);
router.patch('/ambulance-requests/:id/pickup', markPickup);
router.patch('/ambulance-requests/:id/complete', markComplete);

module.exports = router;
