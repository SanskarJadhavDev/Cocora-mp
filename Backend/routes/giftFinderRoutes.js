const express = require('express');
const router = express.Router();
const giftFinderController = require('../controllers/giftFinderController');

router.post('/recommend', giftFinderController.getRecommendations);

module.exports = router;
