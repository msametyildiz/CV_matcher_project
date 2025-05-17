const path = require('path');
const fs = require('fs');
const CV = require('../models/CV');
const cvParserService = require('./cv-parser.service');
const openaiService = require('./openai.service');

/**
 * CV analizi ve GPT değerlendirmesi yapma
 * @param {Object} cv - CV veritabanı obje referansı
 * @returns {Promise<Object>} - Güncellenmiş CV objesi
 */
async function analyzeCV(cv) {
  try {
    // CV içeriği yoksa dosyadan çıkar
    if (!cv.content) {
      const parsedCV = await cvParserService.parseCV(cv.filePath, cv.fileType);
      cv.content = parsedCV.content;
      await cv.save();
    }
    
    // GPT analizi yap
    const analysisResult = await openaiService.analyzeCVContent(cv.content);
    
    // CV modelini güncelle
    cv.analysis = {
      technical_skills_score: analysisResult.technical_skills_score,
      project_experience_score: analysisResult.project_experience_score,
      problem_solving_score: analysisResult.problem_solving_score,
      learning_agility_score: analysisResult.learning_agility_score,
      
      communication_score: analysisResult.communication_score,
      teamwork_score: analysisResult.teamwork_score,
      motivation_score: analysisResult.motivation_score,
      adaptability_score: analysisResult.adaptability_score,
      
      final_technical_score: analysisResult.final_technical_score,
      final_hr_score: analysisResult.final_hr_score,
      final_score: analysisResult.final_score,
      
      language_level_score: analysisResult.language_level_score || 0,
      general_recommendation: analysisResult.general_recommendation,
      strengths: analysisResult.strengths || [],
      weaknesses: analysisResult.weaknesses || [],
      ai_commentary: analysisResult.ai_commentary,
      
      analyzedAt: new Date()
    };
    
    await cv.save();
    return cv;
  } catch (error) {
    console.error('CV analiz hatası:', error);
    throw error;
  }
}

/**
 * Yeni CV oluşturma
 * @param {Object} cvData - CV verileri
 * @param {string} userId - Kullanıcı ID
 * @param {Object} fileInfo - Dosya bilgileri
 * @returns {Promise<Object>} - Oluşturulan CV
 */
async function createCV(cvData, userId, fileInfo) {
  try {
    // CV'nin kaydedileceği yolu oluştur
    const uploadDir = path.join(__dirname, '../../uploads/cvs');
    
    // Yüklenecek klasörün varlığını kontrol et, yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Dosya yolunu ve adını belirle
    const timestamp = Date.now();
    const filename = `${timestamp}_${fileInfo.originalname}`;
    const filePath = path.join(uploadDir, filename);
    
    // Dosya halihazırda uploads/cvs altında olabilir, kontrol et
    if (fileInfo.path.includes('/uploads/cvs/')) {
      // Dosya zaten doğru konumda, yeniden kopyalamaya gerek yok
      fs.renameSync(fileInfo.path, filePath);
    } else {
      // Geçici dosyayı hedef klasöre kopyala
      fs.copyFileSync(fileInfo.path, filePath);
      
      // Geçici dosyayı temizle
      fs.unlinkSync(fileInfo.path);
    }
    
    // Dosya tipini belirle
    const fileExtension = path.extname(fileInfo.originalname).toLowerCase();
    let fileType = '';
    
    if (fileExtension === '.pdf') {
      fileType = 'pdf';
    } else if (fileExtension === '.doc' || fileExtension === '.docx') {
      fileType = 'docx';
    } else {
      throw new Error('Desteklenmeyen dosya tipi. Lütfen PDF veya DOCX yükleyin.');
    }
    
    // Dosyadan metni çıkar
    const parsedCV = await cvParserService.parseCV(filePath, fileType);
    
    // Kullanıcının diğer CV'lerini kontrol et (ilk CV ise primary olarak işaretle)
    const userCVCount = await CV.countDocuments({ user: userId });
    const isPrimary = userCVCount === 0;
    
    // Yeni CV objesi oluştur
    const newCV = new CV({
      user: userId,
      title: cvData.title || `CV ${userCVCount + 1}`,
      filename,
      filePath,
      fileType,
      content: parsedCV.content,
      isPrimary
    });
    
    // CV'yi kaydet
    await newCV.save();
    
    // GPT analizi yap
    return await analyzeCV(newCV);
  } catch (error) {
    console.error('CV oluşturma hatası:', error);
    throw error;
  }
}

/**
 * Kullanıcının tüm CV'lerini getirme
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Array>} - CV listesi
 */
async function getUserCVs(userId) {
  try {
    return await CV.find({ user: userId, isActive: true })
      .sort({ createdAt: -1 })
      .select('-content'); // İçerik olmadan getir (büyük veri)
  } catch (error) {
    console.error('Kullanıcı CV listesi hatası:', error);
    throw error;
  }
}

/**
 * Belirli bir CV'yi getirme
 * @param {string} cvId - CV ID
 * @param {string} userId - Kullanıcı ID (opsiyonel, yetki kontrolü için)
 * @returns {Promise<Object>} - CV objesi
 */
async function getCVById(cvId, userId = null) {
  try {
    const query = { _id: cvId };
    
    // Eğer userId verilmişse, bu kullanıcının CV'si olduğunu kontrol et
    if (userId) {
      query.user = userId;
    }
    
    const cv = await CV.findOne(query);
    if (!cv) {
      throw new Error('CV bulunamadı');
    }
    
    return cv;
  } catch (error) {
    console.error('CV getirme hatası:', error);
    throw error;
  }
}

/**
 * CV güncelleme
 * @param {string} cvId - CV ID
 * @param {Object} updateData - Güncellenecek alanlar
 * @param {string} userId - Kullanıcı ID (yetki kontrolü için)
 * @returns {Promise<Object>} - Güncellenmiş CV
 */
async function updateCV(cvId, updateData, userId) {
  try {
    // CV'nin mevcut olduğunu ve bu kullanıcıya ait olduğunu kontrol et
    const cv = await CV.findOne({ _id: cvId, user: userId });
    if (!cv) {
      throw new Error('CV bulunamadı veya düzenleme yetkiniz yok');
    }
    
    // Güncellenebilir alanlar
    const allowedUpdates = ['title', 'isPrimary'];
    
    // İzin verilen alanları güncelle
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        cv[key] = updateData[key];
      }
    });
    
    // CV'yi kaydet
    await cv.save();
    return cv;
  } catch (error) {
    console.error('CV güncelleme hatası:', error);
    throw error;
  }
}

/**
 * CV silme (soft delete)
 * @param {string} cvId - CV ID
 * @param {string} userId - Kullanıcı ID (yetki kontrolü için)
 * @returns {Promise<Object>} - Silinen CV
 */
async function deleteCV(cvId, userId) {
  try {
    // CV'nin mevcut olduğunu ve bu kullanıcıya ait olduğunu kontrol et
    const cv = await CV.findOne({ _id: cvId, user: userId });
    if (!cv) {
      throw new Error('CV bulunamadı veya silme yetkiniz yok');
    }
    
    // CV'yi aktif olmayan olarak işaretle (soft delete)
    cv.isActive = false;
    
    // CV primary ise, başka bir CV'yi primary yap
    if (cv.isPrimary) {
      cv.isPrimary = false;
      
      // Kullanıcının diğer aktif CV'lerini bul
      const otherCVs = await CV.find({ 
        user: userId, 
        _id: { $ne: cvId }, 
        isActive: true 
      }).sort({ createdAt: -1 });
      
      // Eğer başka CV varsa, ilkini primary yap
      if (otherCVs.length > 0) {
        otherCVs[0].isPrimary = true;
        await otherCVs[0].save();
      }
    }
    
    // CV'yi kaydet
    await cv.save();
    return cv;
  } catch (error) {
    console.error('CV silme hatası:', error);
    throw error;
  }
}

module.exports = {
  createCV,
  getUserCVs,
  getCVById,
  updateCV,
  deleteCV,
  analyzeCV
}; 