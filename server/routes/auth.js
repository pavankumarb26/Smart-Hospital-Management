const express = require('express');
const { body } = require('express-validator');
const {
  registerPatient,
  loginPatient,
  loginHospital,
  loginDriver,
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/patient/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').notEmpty(),
  ],
  registerPatient
);

router.post('/patient/login', loginPatient);
router.post('/hospital/login', loginHospital);
router.post('/driver/login', loginDriver);

module.exports = router;
