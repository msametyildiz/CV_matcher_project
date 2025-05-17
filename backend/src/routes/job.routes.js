const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// İş ilanı rotaları

// Tüm iş ilanlarını getirme
router.get(
  '/',
  jobController.getJobs
);

// İş ilanı arama
router.post(
  '/search',
  jobController.searchJobs
);

// Tavsiye edilen iş ilanlarını getirme
router.get(
  '/recommended',
  protect,
  authorize('candidate'),
  jobController.getRecommendedJobs
);

// İş ilanı oluşturma (sadece işveren)
router.post(
  '/',
  protect,
  authorize('employer'),
  jobController.createJob
);

// Belirli bir iş ilanını getirme
router.get(
  '/:id',
  jobController.getJobById
);

// İş ilanı güncelleme (sadece işveren)
router.put(
  '/:id',
  protect,
  authorize('employer'),
  jobController.updateJob
);

// İş ilanı silme (sadece işveren)
router.delete(
  '/:id',
  protect,
  authorize('employer'),
  jobController.deleteJob
);

// İş ilanına başvurma (sadece aday)
router.post(
  '/:id/apply',
  protect,
  authorize('candidate'),
  jobController.applyForJob
);

module.exports = router;