const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Kullanıcı kimliğini doğrulama middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const protect = async (req, res, next) => {
  let token;

  // Token kontrolü
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Bearer token'dan JWT çıkar
      token = req.headers.authorization.split(' ')[1];

      // Boş token kontrolü
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({
          success: false,
          message: 'Geçersiz token formatı'
        });
      }

      // Token doğrulama
      const decoded = jwt.verify(token, config.jwtSecret);

      // Token süresinin geçip geçmediğini kontrol et
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'Token süresi dolmuş'
        });
      }

      // Kullanıcı bilgilerini req.user'a ata (password olmadan)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Kimlik doğrulama başarısız oldu, kullanıcı bulunamadı'
        });
      }

      // Kullanıcının aktif olup olmadığını kontrol et
      if (req.user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Hesabınız askıya alınmış veya devre dışı bırakılmıştır'
        });
      }

      next();
    } catch (error) {
      console.error('Auth hatası:', error);
      
      let message = 'Yetkisiz erişim, token geçersiz';
      
      if (error.name === 'TokenExpiredError') {
        message = 'Token süresi dolmuş';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Geçersiz token formatı';
      }
      
      return res.status(401).json({
        success: false,
        message
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Yetkisiz erişim, token bulunamadı'
    });
  }
};

/**
 * Rol bazlı yetkilendirme
 * @param  {...string} roles - İzin verilen roller
 * @returns {Function} - Express middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user yoksa veya rolü izin verilen roller içinde değilse hata ver
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} rolünün bu kaynağa erişim yetkisi yok`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
}; 