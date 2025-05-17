const CV = require('../models/CV');
const Job = require('../models/Job');
const Matching = require('../models/Matching');
const openaiService = require('./openai.service');

/**
 * CV'yi tek bir iş ilanıyla eşleştirme
 * @param {string} cvId - CV ID
 * @param {string} jobId - İş ilanı ID
 * @returns {Promise<Object>} - Eşleştirme sonucu
 */
async function matchCVWithJob(cvId, jobId) {
  try {
    // CV ve İş ilanı bilgilerini veritabanından al
    const cv = await CV.findById(cvId).populate('user', 'name email');
    const job = await Job.findById(jobId).populate('employer', 'name email company');
    
    if (!cv || !job) {
      throw new Error('CV veya İş ilanı bulunamadı');
    }
    
    // Önceki eşleştirme var mı kontrol et
    const existingMatch = await Matching.findOne({ cv: cvId, job: jobId });
    if (existingMatch) {
      return existingMatch;
    }
    
    // CV içeriği boşsa hata fırlat
    if (!cv.content) {
      throw new Error('CV içeriği bulunamadı, analiz edilemez');
    }
    
    // OpenAI servisi ile eşleştirme analizi yap
    const matchResult = await openaiService.matchCVWithJob(cv.content, job);
    
    // Eşleştirme sonucunu veritabanında sakla
    const matching = new Matching({
      cv: cvId,
      job: jobId,
      candidate: cv.user._id,
      employer: job.employer._id,
      matchScore: matchResult.final_score,
      
      // Kullanılan ağırlıklar
      weightingUsed: {
        technicalWeight: job.matchingWeights?.technicalWeight || 70,
        hrWeight: job.matchingWeights?.hrWeight || 30,
      },
      
      // Detaylı skorlar
      technical_skills_score: matchResult.technical_skills_score,
      project_experience_score: matchResult.project_experience_score,
      problem_solving_score: matchResult.problem_solving_score,
      learning_agility_score: matchResult.learning_agility_score,
      
      communication_score: matchResult.communication_score,
      teamwork_score: matchResult.teamwork_score,
      motivation_score: matchResult.motivation_score,
      adaptability_score: matchResult.adaptability_score,
      
      final_technical_score: matchResult.final_technical_score,
      final_hr_score: matchResult.final_hr_score,
      
      language_level_score: matchResult.language_level_score,
      general_recommendation: matchResult.general_recommendation,
      strengths: matchResult.strengths,
      weaknesses: matchResult.weaknesses,
      ai_commentary: matchResult.ai_commentary,
    });
    
    await matching.save();
    return matching;
  } catch (error) {
    console.error('CV-İş eşleştirme hatası:', error);
    throw error;
  }
}

/**
 * Bir CV'yi tüm aktif iş ilanlarıyla eşleştirme
 * @param {string} cvId - CV ID
 * @returns {Promise<Array>} - Eşleştirme sonuçları
 */
async function matchCVWithAllJobs(cvId) {
  try {
    // CV'nin varlığını kontrol et
    const cv = await CV.findById(cvId);
    if (!cv) {
      throw new Error('CV bulunamadı');
    }
    
    // Tüm aktif iş ilanlarını getir
    const activeJobs = await Job.find({ status: 'active' });
    
    // Her iş ilanı için eşleştirme yap
    const matchingPromises = activeJobs.map(job => 
      matchCVWithJob(cvId, job._id)
        .catch(error => {
          console.error(`${job._id} ID'li iş ilanı için eşleştirme hatası:`, error);
          return null; // Hata olursa null dön, diğer eşleştirmeler devam etsin
        })
    );
    
    // Tüm eşleştirmeleri paralel olarak çalıştır
    const matchResults = await Promise.all(matchingPromises);
    
    // null olmayan sonuçları filtrele
    return matchResults.filter(result => result !== null);
  } catch (error) {
    console.error('Toplu eşleştirme hatası:', error);
    throw error;
  }
}

/**
 * Bir iş ilanını tüm CV'lerle eşleştirme
 * @param {string} jobId - İş ilanı ID
 * @returns {Promise<Array>} - Eşleştirme sonuçları
 */
async function matchJobWithAllCVs(jobId) {
  try {
    // İş ilanının varlığını kontrol et
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('İş ilanı bulunamadı');
    }
    
    // Tüm aktif CV'leri getir
    const activeCVs = await CV.find({ isActive: true });
    
    // Her CV için eşleştirme yap
    const matchingPromises = activeCVs.map(cv => 
      matchCVWithJob(cv._id, jobId)
        .catch(error => {
          console.error(`${cv._id} ID'li CV için eşleştirme hatası:`, error);
          return null; // Hata olursa null dön, diğer eşleştirmeler devam etsin
        })
    );
    
    // Tüm eşleştirmeleri paralel olarak çalıştır
    const matchResults = await Promise.all(matchingPromises);
    
    // null olmayan sonuçları filtrele
    return matchResults.filter(result => result !== null);
  } catch (error) {
    console.error('Toplu CV eşleştirme hatası:', error);
    throw error;
  }
}

/**
 * Bir kullanıcının CV'lerini en iyi eşleşen iş ilanlarıyla eşleştirme
 * @param {string} userId - Kullanıcı ID
 * @param {number} limit - Maksimum iş ilanı sayısı
 * @returns {Promise<Array>} - Eşleşme sonuçları
 */
async function getTopMatchingJobsForUser(userId, limit = 10) {
  try {
    // Kullanıcının CV'lerini bul
    const userCVs = await CV.find({ user: userId, isActive: true });
    if (!userCVs || userCVs.length === 0) {
      return [];
    }
    
    // Tüm CV'ler için eşleştirme sonuçlarını al
    const matchPromises = userCVs.map(cv => 
      Matching.find({ cv: cv._id })
        .sort({ matchScore: -1 })
        .populate('job', 'title company location employmentType experienceLevel')
        .limit(limit)
    );
    
    const matchResults = await Promise.all(matchPromises);
    
    // Tüm sonuçları düzleştir ve tekrarları kaldır
    let allMatches = matchResults.flat();
    
    // Benzersiz iş ilanlarını filtrele (aynı iş için en yüksek puanlı eşleşmeyi tut)
    const jobMatchMap = new Map();
    
    allMatches.forEach(match => {
      const jobId = match.job._id.toString();
      if (!jobMatchMap.has(jobId) || jobMatchMap.get(jobId).matchScore < match.matchScore) {
        jobMatchMap.set(jobId, match);
      }
    });
    
    // En iyi eşleşmeleri puana göre sırala
    const results = Array.from(jobMatchMap.values())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
      
    return results;
  } catch (error) {
    console.error('Kullanıcı için en iyi eşleşme hatası:', error);
    throw error;
  }
}

/**
 * Kullanıcıya önerilen iş ilanlarını getirme
 * @param {string} userId - Kullanıcı ID
 * @param {number} limit - Maksimum iş ilanı sayısı
 * @returns {Promise<Array>} - Önerilen iş ilanları
 */
async function getRecommendedJobsForUser(userId, limit = 10) {
  try {
    // Önce kullanıcının en iyi eşleşen işlerini getir
    const topMatches = await getTopMatchingJobsForUser(userId, limit);
    
    // Eğer yeterli eşleşme varsa, bunları döndür
    if (topMatches.length >= limit) {
      return topMatches;
    }
    
    // Yeterli eşleşme yoksa, en yeni işleri de ekle
    const existingJobIds = topMatches.map(match => match.job._id);
    
    const additionalJobs = await Job.find({
      _id: { $nin: existingJobIds },
      status: 'active'
    })
    .sort({ createdAt: -1 })
    .limit(limit - topMatches.length);
    
    // Ek işleri eşleşme sonucu formatına dönüştür
    const additionalResults = additionalJobs.map(job => ({
      job: job,
      matchScore: null, // Henüz eşleştirme yapılmamış
      isRecommended: true
    }));
    
    // Sonuçları birleştir
    return [...topMatches, ...additionalResults];
  } catch (error) {
    console.error('Önerilen işler hatası:', error);
    throw error;
  }
}

/**
 * Bir iş ilanı için en iyi eşleşen CV'leri getirme
 * @param {string} jobId - İş ilanı ID
 * @param {number} limit - Maksimum CV sayısı
 * @returns {Promise<Array>} - Eşleşme sonuçları
 */
async function getTopMatchingCVsForJob(jobId, limit = 20) {
  try {
    // İş ilanı için tüm eşleştirmeleri al
    const matches = await Matching.find({ job: jobId })
      .sort({ matchScore: -1 })
      .populate({
        path: 'cv',
        select: 'title filename'
      })
      .populate({
        path: 'candidate',
        select: 'name email'
      })
      .limit(limit);
      
    return matches;
  } catch (error) {
    console.error('İş ilanı için en iyi eşleşme hatası:', error);
    throw error;
  }
}

module.exports = {
  matchCVWithJob,
  matchCVWithAllJobs,
  matchJobWithAllCVs,
  getTopMatchingJobsForUser,
  getTopMatchingCVsForJob,
  getRecommendedJobsForUser
}; 