const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Eşleştirme rotaları

// CV ile İş ilanını eşleştirme
router.post(
  '/match',
  protect,
  matchingController.matchCVWithJob
);

// Bir iş ilanı için en iyi eşleşen CV'leri getirme (işveren)
router.get(
  '/job/:jobId',
  protect,
  authorize('employer', 'admin'),
  matchingController.getMatchingResultsByJobId
);

// Yeni eklenen endpoint: Bir iş ilanına yapılan tüm başvuruların CV'lerini analiz etme
router.post(
  '/analyze-job-applications/:jobId',
  protect,
  authorize('employer', 'admin'),
  matchingController.analyzeJobApplications
);

// Bir CV için en iyi eşleşen iş ilanlarını getirme (aday)
router.get(
  '/cv/:cvId',
  protect,
  authorize('candidate', 'admin'),
  matchingController.getMatchingResultsByCvId
);

// Kullanıcı için tavsiye edilen iş ilanlarını getirme (aday)
router.get(
  '/recommended',
  protect,
  authorize('candidate'),
  matchingController.getRecommendedJobs
);

// CV ve iş ilanı için detaylı eşleştirme sonuçlarını getirme
router.get(
  '/result/:cvId/:jobId',
  protect,
  matchingController.getDetailedMatchingResult
);

module.exports = router; 