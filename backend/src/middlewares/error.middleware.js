/**
 * Hata işleme middleware'i
 * Tüm controller'larda standart hata formatı sağlar
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Varsayılan hata mesajı ve kodu
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Sunucu hatası';

  // MongoDB hata kontrolü
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Kaynak bulunamadı';
  }

  // MongoDB duplicate key hatası
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Bu değer zaten kullanımda';
  }

  // Validation hatası
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT hatası
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token';
  }

  // JWT süresi dolmuş hatası
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token süresi dolmuş';
  }

  // Yanıtı döndür
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler; 