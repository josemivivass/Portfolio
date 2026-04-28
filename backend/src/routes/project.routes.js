const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getAllProjects);
router.get('/featured', projectController.getFeaturedProjects);
router.get('/images/:folder/:filename', projectController.getProjectImage);
router.get('/images/:filename', projectController.getProjectImage);

module.exports = router;