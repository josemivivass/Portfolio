const express = require('express');
const router = express.Router();
const profile = require('../controllers/profile.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const editorOrAdmin = [verifyToken, requireRole('admin', 'editor')];

router.get('/texts', profile.getTexts);
router.get('/photo', profile.getPhoto);
router.get('/cv-meta', editorOrAdmin, profile.getCvMeta);
router.get('/cv/:lang', profile.getCv);
router.get('/chatbot-prompt', editorOrAdmin, profile.getChatbotPrompt);
router.get('/chatbot-model', editorOrAdmin, profile.getChatbotModel);

router.put('/texts', editorOrAdmin, profile.updateTexts);
router.put('/chatbot-prompt', editorOrAdmin, profile.updateChatbotPrompt);
router.put('/chatbot-model', editorOrAdmin, profile.updateChatbotModel);
router.post('/photo', editorOrAdmin, profile.uploadPhoto);
router.post('/cv/:lang', editorOrAdmin, profile.uploadCv);

module.exports = router;
