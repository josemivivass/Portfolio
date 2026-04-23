const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getAllProjects);
router.get('/featured', projectController.getFeaturedProjects);

module.exports = router;