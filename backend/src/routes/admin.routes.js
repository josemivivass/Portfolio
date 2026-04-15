const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const editorOrAdmin = [verifyToken, requireRole('admin', 'editor')];
const adminOnly = [verifyToken, requireRole('admin')];

// Users
router.get('/users', editorOrAdmin, admin.listUsers);
router.patch('/users/:id/role', adminOnly, admin.updateUserRole);
router.put('/users/:id', editorOrAdmin, admin.updateUser);
router.delete('/users/:id', adminOnly, admin.deleteUser);

// Projects
router.post('/projects', editorOrAdmin, admin.createProject);
router.put('/projects/:id', editorOrAdmin, admin.updateProject);
router.delete('/projects/:id', adminOnly, admin.deleteProject);

// Experience
router.post('/experience', editorOrAdmin, admin.createExperience);
router.put('/experience/:id', editorOrAdmin, admin.updateExperience);
router.delete('/experience/:id', adminOnly, admin.deleteExperience);

// Logs / mensajes (admin y editor pueden consultar)
router.get('/visitor-logs', editorOrAdmin, admin.listVisitorLogs);
router.get('/login-logs', editorOrAdmin, admin.listLoginLogs);
router.get('/contact-messages', editorOrAdmin, admin.listContactMessages);
router.patch('/contact-messages/:id/answered', editorOrAdmin, admin.updateContactMessageAnswered);
router.delete('/contact-messages/:id', adminOnly, admin.deleteContactMessage);

module.exports = router;
