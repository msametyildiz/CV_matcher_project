const cvService = require('../services/cv.service');
const matchingService = require('../services/matching.service');

/**
 * CV yükleme
 * @route POST /api/cv/upload
 * @access Private (candidate)
 */
const uploadCV = async (req, res) => {
  try {
    // Dosya kontrolü
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir CV dosyası yükleyin'
      });
    }

    // CV oluştur
    const cv = await cvService.createCV(
      req.body,
      req.user._id,
      req.file
    );

    // CV yüklemesinden sonra mevcut iş ilanlarıyla eşleştir
    // Bu işlem arka planda async olarak çalışır, yanıtı beklemeyiz
    matchingService.matchCVWithAllJobs(cv._id)
      .then(matches => {
        console.log(`${matches.length} iş ilanı ile eşleştirildi.`);
      })
      .catch(error => {
        console.error('CV eşleştirme hatası:', error);
      });

    // CV'yi döndür
    res.status(201).json({
      success: true,
      data: {
        _id: cv._id,
        title: cv.title,
        filename: cv.filename,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        analysis: {
          final_technical_score: cv.analysis?.final_technical_score,
          final_hr_score: cv.analysis?.final_hr_score,
          final_score: cv.analysis?.final_score,
          language_level_score: cv.analysis?.language_level_score,
          general_recommendation: cv.analysis?.general_recommendation,
          strengths: cv.analysis?.strengths,
          weaknesses: cv.analysis?.weaknesses
        }
      }
    });
  } catch (error) {
    console.error('CV yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV yükleme sırasında bir hata oluştu'
    });
  }
};

/**
 * Kullanıcının kendi CV'lerini getirme
 * @route GET /api/cv/my-cvs
 * @access Private (candidate)
 */
const getCurrentUserCVs = async (req, res) => {
  try {
    const cvs = await cvService.getUserCVs(req.user._id);

    res.json({
      success: true,
      count: cvs.length,
      data: cvs.map(cv => ({
        _id: cv._id,
        title: cv.title,
        filename: cv.filename,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        analysis: {
          final_technical_score: cv.analysis?.final_technical_score,
          final_hr_score: cv.analysis?.final_hr_score,
          final_score: cv.analysis?.final_score,
          language_level_score: cv.analysis?.language_level_score,
          general_recommendation: cv.analysis?.general_recommendation,
          strengths: cv.analysis?.strengths,
          weaknesses: cv.analysis?.weaknesses
        }
      }))
    });
  } catch (error) {
    console.error('CV listesi hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV listesi alınırken bir hata oluştu'
    });
  }
};

/**
 * Belirli bir CV'yi getirme
 * @route GET /api/cv/:id
 * @access Private
 */
const getCVById = async (req, res) => {
  try {
    // CV ID'sini al
    const cvId = req.params.id;

    // Kullanıcı rolüne göre erişim kontrolü
    let cv;
    if (req.user.role === 'candidate') {
      // Aday sadece kendi CV'lerini görebilir
      cv = await cvService.getCVById(cvId, req.user._id);
    } else if (['employer', 'admin'].includes(req.user.role)) {
      // İşveren ve yönetici tüm CV'leri görebilir
      cv = await cvService.getCVById(cvId);
    }

    if (!cv) {
      return res.status(404).json({
        success: false,
        message: 'CV bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        _id: cv._id,
        title: cv.title,
        filename: cv.filename,
        filePath: cv.filePath,
        fileType: cv.fileType,
        content: cv.content,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        user: cv.user,
        analysis: cv.analysis
      }
    });
  } catch (error) {
    console.error('CV getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV alınırken bir hata oluştu'
    });
  }
};

/**
 * CV güncelleme
 * @route PUT /api/cv/:id
 * @access Private (candidate)
 */
const updateCV = async (req, res) => {
  try {
    // CV ID'sini al
    const cvId = req.params.id;

    // CV'yi güncelle
    const cv = await cvService.updateCV(cvId, req.body, req.user._id);

    res.json({
      success: true,
      data: {
        _id: cv._id,
        title: cv.title,
        filename: cv.filename,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        analysis: {
          final_technical_score: cv.analysis?.final_technical_score,
          final_hr_score: cv.analysis?.final_hr_score,
          final_score: cv.analysis?.final_score,
          language_level_score: cv.analysis?.language_level_score,
          general_recommendation: cv.analysis?.general_recommendation,
          strengths: cv.analysis?.strengths,
          weaknesses: cv.analysis?.weaknesses
        }
      }
    });
  } catch (error) {
    console.error('CV güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV güncellenirken bir hata oluştu'
    });
  }
};

/**
 * CV silme
 * @route DELETE /api/cv/:id
 * @access Private (candidate)
 */
const deleteCV = async (req, res) => {
  try {
    // CV ID'sini al
    const cvId = req.params.id;

    // CV'yi sil
    await cvService.deleteCV(cvId, req.user._id);

    res.json({
      success: true,
      message: 'CV başarıyla silindi'
    });
  } catch (error) {
    console.error('CV silme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV silinirken bir hata oluştu'
    });
  }
};

/**
 * CV'yi yeniden analiz etme
 * @route POST /api/cv/:id/analyze
 * @access Private (candidate)
 */
const reanalyzeCV = async (req, res) => {
  try {
    // CV ID'sini al
    const cvId = req.params.id;

    // CV'yi getir
    let cv = await cvService.getCVById(cvId, req.user._id);

    // CV'yi analiz et
    cv = await cvService.analyzeCV(cv);

    // CV yüklemesinden sonra mevcut iş ilanlarıyla eşleştir
    // Bu işlem arka planda async olarak çalışır, yanıtı beklemeyiz
    matchingService.matchCVWithAllJobs(cv._id)
      .then(matches => {
        console.log(`${matches.length} iş ilanı ile eşleştirildi.`);
      })
      .catch(error => {
        console.error('CV eşleştirme hatası:', error);
      });

    res.json({
      success: true,
      data: {
        _id: cv._id,
        title: cv.title,
        filename: cv.filename,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        analysis: {
          final_technical_score: cv.analysis?.final_technical_score,
          final_hr_score: cv.analysis?.final_hr_score,
          final_score: cv.analysis?.final_score,
          language_level_score: cv.analysis?.language_level_score,
          general_recommendation: cv.analysis?.general_recommendation,
          strengths: cv.analysis?.strengths,
          weaknesses: cv.analysis?.weaknesses
        }
      }
    });
  } catch (error) {
    console.error('CV analiz hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV analiz edilirken bir hata oluştu'
    });
  }
};

/**
 * CV dosyasını indirme
 * @route GET /api/cv/:id/download
 * @access Private
 */
const downloadCV = async (req, res) => {
  try {
    // CV ID'sini al
    const cvId = req.params.id;

    // Kullanıcı rolüne göre erişim kontrolü
    let cv;
    if (req.user.role === 'candidate') {
      // Aday sadece kendi CV'lerini indirebilir
      cv = await cvService.getCVById(cvId, req.user._id);
    } else if (['employer', 'admin'].includes(req.user.role)) {
      // İşveren ve yönetici tüm CV'leri indirebilir
      cv = await cvService.getCVById(cvId);
    }

    if (!cv) {
      return res.status(404).json({
        success: false,
        message: 'CV bulunamadı'
      });
    }

    // Dosya yolu kontrolü
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(cv.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'CV dosyası bulunamadı'
      });
    }

    // Dosyayı gönder
    res.download(
      cv.filePath,
      cv.filename,
      (err) => {
        if (err) {
          console.error('CV indirme hatası:', err);
          return res.status(500).json({
            success: false,
            message: 'CV indirilirken bir hata oluştu'
          });
        }
      }
    );
  } catch (error) {
    console.error('CV indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'CV indirilirken bir hata oluştu'
    });
  }
};

module.exports = {
  uploadCV,
  getCurrentUserCVs,
  getCVById,
  updateCV,
  deleteCV,
  reanalyzeCV,
  downloadCV
}; 