const matchingService = require('../services/matching.service');
const CV = require('../models/CV');
const Job = require('../models/Job');
const openaiService = require('../services/openai.service');

/**
 * CV'yi bir iş ilanıyla eşleştirme
 * @route POST /api/matching/match
 * @access Private
 */
const matchCVWithJob = async (req, res) => {
  try {
    const { cvId, jobId } = req.body;

    // Parametreleri kontrol et
    if (!cvId || !jobId) {
      return res.status(400).json({
        success: false,
        message: 'CV ID ve Job ID gereklidir'
      });
    }

    // Yetki kontrolü
    let cv;
    if (req.user.role === 'candidate') {
      // Aday sadece kendi CV'lerini eşleştirebilir
      cv = await CV.findOne({ _id: cvId, user: req.user._id });
      if (!cv) {
        return res.status(403).json({
          success: false,
          message: 'Bu CV üzerinde işlem yapma yetkiniz yok'
        });
      }
    }

    // Eşleştirme yap
    const matchResult = await matchingService.matchCVWithJob(cvId, jobId);

    res.json({
      success: true,
      data: matchResult
    });
  } catch (error) {
    console.error('Eşleştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Eşleştirme sırasında bir hata oluştu'
    });
  }
};

/**
 * Belirli bir iş ilanı için en iyi eşleşen CV'leri getirme
 * @route GET /api/matching/job/:jobId
 * @access Private (employer)
 */
const getMatchingResultsByJobId = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const limit = parseInt(req.query.limit) || 20;

    // İş ilanının varlığını ve yetkiyi kontrol et
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    // İşveren sadece kendi ilanlarının eşleşmelerini görebilir
    if (req.user.role === 'employer' && job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bu iş ilanı üzerinde işlem yapma yetkiniz yok'
      });
    }

    // Eşleşme sonuçlarını getir
    const matches = await matchingService.getTopMatchingCVsForJob(jobId, limit);

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Eşleşme sonuçları hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Eşleşme sonuçları alınırken bir hata oluştu'
    });
  }
};

/**
 * Belirli bir CV için en iyi eşleşen iş ilanlarını getirme
 * @route GET /api/matching/cv/:cvId
 * @access Private (candidate)
 */
const getMatchingResultsByCvId = async (req, res) => {
  try {
    const cvId = req.params.cvId;
    const limit = parseInt(req.query.limit) || 10;

    // CV'nin varlığını ve yetkiyi kontrol et
    const cv = await CV.findById(cvId);
    if (!cv) {
      return res.status(404).json({
        success: false,
        message: 'CV bulunamadı'
      });
    }

    // Aday sadece kendi CV'lerinin eşleşmelerini görebilir
    if (req.user.role === 'candidate' && cv.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bu CV üzerinde işlem yapma yetkiniz yok'
      });
    }

    // Eşleşme sonuçlarını getir
    // TODO: CV bazlı eşleşme sonuçları servisini oluştur
    const matches = await Matching.find({ cv: cvId })
      .sort({ matchScore: -1 })
      .populate('job', 'title company location employmentType experienceLevel')
      .limit(limit);

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Eşleşme sonuçları hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Eşleşme sonuçları alınırken bir hata oluştu'
    });
  }
};

/**
 * Bir kullanıcı için en iyi eşleşen iş ilanlarını getirme
 * @route GET /api/matching/recommended
 * @access Private (candidate)
 */
const getRecommendedJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Kullanıcı için en iyi eşleşen iş ilanlarını getir
    const matches = await matchingService.getTopMatchingJobsForUser(req.user._id, limit);

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Tavsiye edilen iş ilanları hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Tavsiye edilen iş ilanları alınırken bir hata oluştu'
    });
  }
};

/**
 * CV ve iş ilanı için detaylı eşleştirme sonucunu getirme
 * @route GET /api/matching/result/:cvId/:jobId
 * @access Private
 */
const getDetailedMatchingResult = async (req, res) => {
  try {
    const { cvId, jobId } = req.params;

    // Parametreleri kontrol et
    if (!cvId || !jobId) {
      return res.status(400).json({
        success: false,
        message: 'CV ID ve Job ID gereklidir'
      });
    }

    // Yetki kontrolü
    if (req.user.role === 'candidate') {
      // CV'nin kullanıcıya ait olduğunu kontrol et
      const cv = await CV.findOne({ _id: cvId, user: req.user._id });
      if (!cv) {
        return res.status(403).json({
          success: false,
          message: 'Bu CV üzerinde işlem yapma yetkiniz yok'
        });
      }
    } else if (req.user.role === 'employer') {
      // İş ilanının işverene ait olduğunu kontrol et
      const job = await Job.findOne({ _id: jobId, employer: req.user._id });
      if (!job) {
        return res.status(403).json({
          success: false,
          message: 'Bu iş ilanı üzerinde işlem yapma yetkiniz yok'
        });
      }
    }

    // Eşleştirme detaylarını getir
    const matchResult = await Matching.findOne({ cv: cvId, job: jobId })
      .populate('cv', 'title filename')
      .populate('job', 'title company location employmentType experienceLevel')
      .populate('candidate', 'name email')
      .populate('employer', 'name email company');

    if (!matchResult) {
      return res.status(404).json({
        success: false,
        message: 'Eşleştirme sonucu bulunamadı'
      });
    }

    res.json({
      success: true,
      data: matchResult
    });
  } catch (error) {
    console.error('Detaylı eşleştirme sonucu hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Detaylı eşleştirme sonucu alınırken bir hata oluştu'
    });
  }
};

/**
 * Bir iş ilanına yapılan tüm başvuruları analiz etme
 * @route POST /api/matching/analyze-job-applications/:jobId
 * @access Private (employer)
 */
const analyzeJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // İş ilanının varlığını kontrol et
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }
    
    // İşveren sadece kendi ilanlarını analiz edebilir
    if (req.user.role === 'employer' && job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bu iş ilanı üzerinde işlem yapma yetkiniz yok'
      });
    }
    
    // İş ilanına yapılan tüm başvuruları analiz et
    const results = await matchingService.analyzeAllApplicationsForJob(jobId);
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Başvuru analizi hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Başvuru analizi sırasında bir hata oluştu'
    });
  }
};

module.exports = {
  matchCVWithJob,
  getMatchingResultsByJobId,
  getMatchingResultsByCvId,
  getRecommendedJobs,
  getDetailedMatchingResult,
  analyzeJobApplications
}; 