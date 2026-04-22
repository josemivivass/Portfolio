const express = require('express');
const router = express.Router();
const profile = require('../controllers/profile.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const editorOrAdmin = [verifyToken, requireRole('admin', 'editor')];

router.get('/texts', profile.getTexts);
router.get('/photo', profile.getPhoto);
router.get('/chatbot-prompt', editorOrAdmin, profile.getChatbotPrompt);

router.put('/texts', editorOrAdmin, profile.updateTexts);
router.put('/chatbot-prompt', editorOrAdmin, profile.updateChatbotPrompt);
router.post('/photo', editorOrAdmin, profile.uploadPhoto);

module.exports = router;
