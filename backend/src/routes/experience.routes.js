const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experience.controller');

router.get('/', experienceController.getAllExperience);

module.exports = router;
