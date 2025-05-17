const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

/**
 * JWT token oluştur
 * @param {string} id - Kullanıcı ID 
 * @returns {string} - JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: '30d', // 30 gün
  });
};

/**
 * Şifre gereksinimlerini kontrol et
 * @param {string} password - Kontrol edilecek şifre
 * @returns {boolean} - Şifre gereksinimleri karşılıyor mu
 */
const validatePassword = (password) => {
  // En az 6 karakter
  if (password.length < 6) {
    return false;
  }
  
  return true;
};

/**
 * Email formatını kontrol et
 * @param {string} email - Kontrol edilecek email
 * @returns {boolean} - Email formatı geçerli mi
 */
const validateEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// Şifre sıfırlama token'ı oluşturma
const generateResetToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Reset token hash'leme
const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateToken,
  validatePassword,
  validateEmail,
  generateResetToken,
  hashResetToken
}; 