const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const education = require('../controllers/education.controller');
const skills = require('../controllers/skills.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const editorOrAdmin = [verifyToken, requireRole('admin', 'editor')];
const adminOnly = [verifyToken, requireRole('admin')];
const rawSqlBody = express.text({ limit: '50mb', type: ['application/sql', 'text/plain'] });

// Users
router.get('/users', editorOrAdmin, admin.listUsers);
router.patch('/users/:id/role', adminOnly, admin.updateUserRole);
router.put('/users/:id', adminOnly, admin.updateUser);
router.delete('/users/:id', adminOnly, admin.deleteUser);

// Projects
router.post('/projects', editorOrAdmin, admin.createProject);
router.put('/projects/:id', editorOrAdmin, admin.updateProject);
router.delete('/projects/:id', adminOnly, admin.deleteProject);
router.post('/projects/upload-image', editorOrAdmin, admin.uploadProjectImage);

// Experience
router.post('/experience', editorOrAdmin, admin.createExperience);
router.put('/experience/:id', editorOrAdmin, admin.updateExperience);
router.delete('/experience/:id', adminOnly, admin.deleteExperience);

// Education
router.post('/education', editorOrAdmin, education.createEducation);
router.put('/education/:id', editorOrAdmin, education.updateEducation);
router.delete('/education/:id', adminOnly, education.deleteEducation);

// Skills
router.post('/skills', editorOrAdmin, skills.createSkill);
router.put('/skills/:id', editorOrAdmin, skills.updateSkill);
router.delete('/skills/:id', adminOnly, skills.deleteSkill);

// Logs / mensajes (admin y editor pueden consultar; sólo admin puede borrar)
router.get('/visitor-logs', editorOrAdmin, admin.listVisitorLogs);
router.delete('/visitor-logs/:id', adminOnly, admin.deleteVisitorLog);
router.get('/login-logs', editorOrAdmin, admin.listLoginLogs);
router.delete('/login-logs/:id', adminOnly, admin.deleteLoginLog);
router.get('/contact-messages', editorOrAdmin, admin.listContactMessages);
router.patch('/contact-messages/:id/answered', editorOrAdmin, admin.updateContactMessageAnswered);
router.delete('/contact-messages/:id', adminOnly, admin.deleteContactMessage);

// Chatbot
router.get('/chatbot-messages', editorOrAdmin, admin.listChatbotConversations);
router.delete('/chatbot-messages/:id', adminOnly, admin.deleteChatbotMessage);
router.post('/chatbot-conversations/delete', adminOnly, admin.deleteChatbotConversation);

// Backup / restore
router.get('/backup', adminOnly, admin.downloadBackup);
router.post('/backup/drive', adminOnly, admin.runDriveBackup);
router.post('/restore', adminOnly, rawSqlBody, admin.restoreBackup);

module.exports = router;