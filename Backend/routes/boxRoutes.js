const express = require('express');
const { validateBox, checkoutBox } = require('../controllers/boxController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/validate', validateBox);
router.post('/checkout', protect, checkoutBox);

module.exports = router;
