const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cvController = require('../controllers/cv.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const fs = require('fs');

// Dosya yükleme için Multer yapılandırması
const upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadDir = path.join(__dirname, '../../uploads/cvs');
      
      // Klasörün var olduğundan emin ol
      fs.mkdirSync(uploadDir, { recursive: true });
      
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `cv-${uniqueSuffix}${extension}`);
    }
  }),
  fileFilter: function(req, file, cb) {
    // Sadece PDF ve DOCX dosyalarına izin ver
    const filetypes = /pdf|docx|doc/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Sadece PDF ve DOCX dosyaları yüklenebilir!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB sınırı
  }
});

// Multer hata yakalama middleware'i
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu 10MB sınırını aşıyor'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Dosya yükleme hatası: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// CV rotaları

// CV yükleme (sadece aday)
router.post(
  '/upload',
  protect,
  authorize('candidate'),
  upload.single('cv'),
  handleMulterError,
  cvController.uploadCV
);

// Kendi CV'lerini getirme (sadece aday)
router.get(
  '/my-cvs',
  protect,
  authorize('candidate'),
  cvController.getCurrentUserCVs
);

// Belirli CV'yi getirme
router.get(
  '/:id',
  protect,
  cvController.getCVById
);

// CV indirme
router.get(
  '/:id/download',
  protect,
  cvController.downloadCV
);

// CV güncelleme (sadece aday)
router.put(
  '/:id',
  protect,
  authorize('candidate'),
  cvController.updateCV
);

// CV silme (sadece aday)
router.delete(
  '/:id',
  protect,
  authorize('candidate'),
  cvController.deleteCV
);

// CV'yi yeniden analiz etme (sadece aday)
router.post(
  '/:id/analyze',
  protect,
  authorize('candidate'),
  cvController.reanalyzeCV
);

module.exports = router; 