const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  loginAdmin,
  getPendingHospitals,
  getAllHospitals,
  approveHospital,
  rejectHospital,
} = require('../controllers/adminController');

const router = express.Router();

router.post('/login', loginAdmin);
router.use(auth(['admin']));
router.get('/hospitals/pending', getPendingHospitals);
router.get('/hospitals', getAllHospitals);
router.patch('/hospitals/:id/approve', approveHospital);
router.patch('/hospitals/:id/reject', rejectHospital);

module.exports = router;
