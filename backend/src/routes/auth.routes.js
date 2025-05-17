const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// Kimlik doğrulama rotaları
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Google OAuth
router.post('/google', authController.googleAuth);

// Korumalı rotalar
router.get('/me', protect, authController.getCurrentUser);
router.put('/profile', protect, authController.updateProfile);

module.exports = router; 