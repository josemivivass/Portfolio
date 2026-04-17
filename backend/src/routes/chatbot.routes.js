const express = require('express');
const router = express.Router();
const chatbot = require('../controllers/chatbot.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/', verifyToken, chatbot.sendMessage);
router.get('/history', verifyToken, chatbot.getHistory);
router.post('/clear', verifyToken, chatbot.clearChat);

module.exports = router;
