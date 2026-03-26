const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');

router.post('/entry', trackingController.logEntry);

module.exports = router;