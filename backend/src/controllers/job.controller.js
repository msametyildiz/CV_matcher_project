const Job = require('../models/Job');
const matchingService = require('../services/matching.service');
const Application = require('../models/Application');

/**
 * İş ilanı oluşturma
 * @route POST /api/jobs
 * @access Private (employer)
 */
const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      employer: req.user._id
    };

    // Teknik ve İK ağırlıkları kontrol et
    if (req.body.matchingWeights) {
      const technicalWeight = parseInt(req.body.matchingWeights.technicalWeight);
      if (technicalWeight >= 0 && technicalWeight <= 100) {
        jobData.matchingWeights = {
          technicalWeight,
          hrWeight: 100 - technicalWeight
        };
      }
    }

    // İş ilanı oluştur
    const job = await Job.create(jobData);

    // İş ilanı oluşturulduktan sonra CV'lerle eşleştir
    // Bu işlem arka planda async olarak çalışır, yanıtı beklemeyiz
    matchingService.matchJobWithAllCVs(job._id)
      .then(matches => {
        console.log(`${matches.length} CV ile eşleştirildi.`);
      })
      .catch(error => {
        console.error('İş ilanı eşleştirme hatası:', error);
      });

    // Cevap döndür
    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('İş ilanı oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanı oluşturulurken bir hata oluştu'
    });
  }
};

/**
 * Tüm iş ilanlarını getirme
 * @route GET /api/jobs
 * @access Public
 */
const getJobs = async (req, res) => {
  try {
    // Filtreleme seçenekleri
    const filter = { status: 'active' };
    
    // Eğer işveren kendi ilanlarını istiyorsa
    if (req.query.employer === 'me' && req.user && req.user.role === 'employer') {
      filter.employer = req.user._id;
      // İşveren kendi tüm ilanlarını görebilir (aktif veya değil)
      delete filter.status;
    }

    // Query parametrelerinden filtreleri ekle
    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: 'i' };
    }
    if (req.query.employmentType) {
      filter.employmentType = req.query.employmentType;
    }
    if (req.query.experienceLevel) {
      filter.experienceLevel = req.query.experienceLevel;
    }

    // Sayfalama
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Arama sorgusu
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // İş ilanlarını getir
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employer', 'name company');

    // Toplam iş ilanı sayısını getir
    const total = await Job.countDocuments(filter);

    // Cevap döndür
    res.json({
      success: true,
      count: jobs.length,
      total,
      pages: Math.ceil(total / limit),
      page,
      data: jobs
    });
  } catch (error) {
    console.error('İş ilanları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanları alınırken bir hata oluştu'
    });
  }
};

/**
 * Belirli bir iş ilanını getirme
 * @route GET /api/jobs/:id
 * @access Public
 */
const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;

    // İş ilanını getir
    const job = await Job.findById(jobId).populate('employer', 'name company');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    // Görüntülenme sayısını artır
    // Sadece aktif ilanlar için
    if (job.status === 'active') {
      job.viewCount += 1;
      await job.save();
    }

    // İşveren kendisi mi kontrol et
    const isOwner = req.user && req.user._id.toString() === job.employer._id.toString();

    // Cevap döndür
    res.json({
      success: true,
      data: job,
      isOwner
    });
  } catch (error) {
    console.error('İş ilanı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanı alınırken bir hata oluştu'
    });
  }
};

/**
 * İş ilanı güncelleme
 * @route PUT /api/jobs/:id
 * @access Private (employer)
 */
const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    // İş ilanını getir
    let job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    // Yetkiyi kontrol et
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bu iş ilanını düzenleme yetkiniz yok'
      });
    }

    // Teknik ve İK ağırlıkları düzenleme
    if (req.body.matchingWeights) {
      const technicalWeight = parseInt(req.body.matchingWeights.technicalWeight);
      if (technicalWeight >= 0 && technicalWeight <= 100) {
        req.body.matchingWeights = {
          technicalWeight,
          hrWeight: 100 - technicalWeight
        };
      }
    }

    // İş ilanını güncelle
    job = await Job.findByIdAndUpdate(jobId, req.body, {
      new: true,
      runValidators: true
    });

    // Güncelleme sonrası tüm CV'lerle yeniden eşleştir
    // Bu işlem arka planda async olarak çalışır, yanıtı beklemeyiz
    if (req.body.matchingWeights) {
      matchingService.matchJobWithAllCVs(job._id)
        .then(matches => {
          console.log(`${matches.length} CV ile yeniden eşleştirildi.`);
        })
        .catch(error => {
          console.error('İş ilanı yeniden eşleştirme hatası:', error);
        });
    }

    // Cevap döndür
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('İş ilanı güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanı güncellenirken bir hata oluştu'
    });
  }
};

/**
 * İş ilanı silme
 * @route DELETE /api/jobs/:id
 * @access Private (employer)
 */
const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    // İş ilanını getir
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    // Yetkiyi kontrol et
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bu iş ilanını silme yetkiniz yok'
      });
    }

    // Tamamen silmek yerine durumunu "archived" olarak güncelle
    job.status = 'archived';
    await job.save();

    // Cevap döndür
    res.json({
      success: true,
      message: 'İş ilanı başarıyla arşivlendi'
    });
  } catch (error) {
    console.error('İş ilanı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanı silinirken bir hata oluştu'
    });
  }
};

/**
 * Gelişmiş iş ilanı arama
 * @route POST /api/jobs/search
 * @access Public
 */
const searchJobs = async (req, res) => {
  try {
    // Arama filtreleri
    const {
      keywords,
      location,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      sortBy,
      page = 1,
      limit = 10
    } = req.body;

    // Temel filtre: sadece aktif ilanlar
    const filter = { status: 'active' };

    // Anahtar kelime araması
    if (keywords) {
      filter.$or = [
        { title: { $regex: keywords, $options: 'i' } },
        { company: { $regex: keywords, $options: 'i' } },
        { description: { $regex: keywords, $options: 'i' } }
      ];
    }

    // Diğer filtreleri ekle
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (employmentType) {
      filter.employmentType = employmentType;
    }
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    // Maaş aralığı filtresi
    if (salaryMin || salaryMax) {
      filter['salaryRange.isVisible'] = true; // Sadece görünür maaşlar

      if (salaryMin) {
        filter['salaryRange.max'] = { $gte: salaryMin };
      }
      if (salaryMax) {
        filter['salaryRange.min'] = { $lte: salaryMax };
      }
    }

    // Sayfalama
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sıralama seçenekleri
    let sortOptions = { createdAt: -1 }; // Varsayılan: en yeniler
    if (sortBy === 'salary-high') {
      sortOptions = { 'salaryRange.max': -1 };
    } else if (sortBy === 'salary-low') {
      sortOptions = { 'salaryRange.min': 1 };
    } else if (sortBy === 'relevance') {
      // TODO: Alaka düzeyine göre sıralama (daha gelişmiş arama algoritması gerektirir)
      sortOptions = { viewCount: -1 }; // Şimdilik en çok görüntülenene göre
    }

    // İş ilanlarını getir
    const jobs = await Job.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('employer', 'name company');

    // Toplam iş ilanı sayısını getir
    const total = await Job.countDocuments(filter);

    // Cevap döndür
    res.json({
      success: true,
      count: jobs.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      data: jobs
    });
  } catch (error) {
    console.error('İş ilanı arama hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş ilanları aranırken bir hata oluştu'
    });
  }
};

/**
 * Tavsiye edilen iş ilanlarını getirme
 * @route GET /api/jobs/recommended
 * @access Private (candidate)
 */
const getRecommendedJobs = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    // Kullanıcının CV'sine göre tavsiye edilen işleri getir
    const matchingResults = await matchingService.getRecommendedJobsForUser(userId, limit);

    // Tavsiye edilen işleri döndür
    res.json({
      success: true,
      count: matchingResults.length,
      data: matchingResults
    });
  } catch (error) {
    console.error('Tavsiye edilen işleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Tavsiye edilen işler alınırken bir hata oluştu'
    });
  }
};

/**
 * İş ilanına başvurma
 * @route POST /api/jobs/:id/apply
 * @access Private (candidate)
 */
const applyForJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;
    const { cvId, coverLetter } = req.body;

    // İş ilanını ve CV'yi kontrol et
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş ilanı bulunamadı'
      });
    }

    // Zaten başvuru yapılmış mı kontrol et
    const existingApplication = await Application.findOne({
      job: jobId,
      candidate: userId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Bu iş ilanına daha önce başvuru yapmışsınız'
      });
    }

    // Yeni başvuru oluştur
    const application = await Application.create({
      job: jobId,
      candidate: userId,
      cv: cvId,
      coverLetter,
      status: 'pending'
    });

    // Başvuru sayısını güncelle
    job.applicationCount += 1;
    await job.save();

    // Cevap döndür
    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('İş başvurusu hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'İş başvurusu yapılırken bir hata oluştu'
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  searchJobs,
  getRecommendedJobs,
  applyForJob
}; 