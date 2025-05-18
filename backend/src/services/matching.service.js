const CV = require('../models/CV');
const Job = require('../models/Job');
const Matching = require('../models/Matching');
const openaiService = require('./openai.service');
const Application = require('../models/Application');

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

/**
 * İş ilanına yapılan tüm başvuruları analiz et
 * @param {string} jobId - İş ilanı ID'si
 * @returns {Promise<Array>} - Analiz sonuçları
 */
const analyzeAllApplicationsForJob = async (jobId) => {
  try {
    // İş ilanını getir
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('İş ilanı bulunamadı');
    }
    
    // Bu iş ilanına yapılan tüm başvuruları getir
    const applications = await Application.find({ job: jobId })
      .populate('cv')
      .populate('candidate', 'name email');
      
    if (!applications || applications.length === 0) {
      return [];
    }
    
    const analyzeResults = [];
    
    // Her başvuru için CV'yi analiz et
    for (const application of applications) {
      try {
        // CV içeriğini analiz için hazırla
        const cv = application.cv;
        if (!cv || !cv.content) {
          console.warn(`CV içeriği eksik, başvuru ID: ${application._id}`);
          continue;
        }
        
        console.log(`Başvuru analiz ediliyor, ID: ${application._id}, CV ID: ${cv._id}`);
        
        // OpenAI API ile CV ve iş ilanı eşleştirmesi yap
        const analysisResult = await openaiService.matchCVWithJob(cv.content, job);
        
        console.log('Analiz sonucu:', JSON.stringify(analysisResult).substring(0, 200) + '...');
        
        // Analiz sonuçlarını doğrula ve varsayılan değerlerle doldur
        const validatedResult = {
          final_score: analysisResult.final_score || 70,
          final_technical_score: analysisResult.final_technical_score || 70,
          final_hr_score: analysisResult.final_hr_score || 70,
          
          technical_skills_score: analysisResult.technical_skills_score || 70,
          project_experience_score: analysisResult.project_experience_score || 65, 
          problem_solving_score: analysisResult.problem_solving_score || 70,
          learning_agility_score: analysisResult.learning_agility_score || 65,
          
          communication_score: analysisResult.communication_score || 70,
          teamwork_score: analysisResult.teamwork_score || 75,
          motivation_score: analysisResult.motivation_score || 65,
          adaptability_score: analysisResult.adaptability_score || 70,
          
          general_recommendation: analysisResult.general_recommendation || 'Değerlendirme gerekli',
          strengths: Array.isArray(analysisResult.strengths) ? analysisResult.strengths : ['Teknik beceriler'],
          weaknesses: Array.isArray(analysisResult.weaknesses) ? analysisResult.weaknesses : ['Deneyim eksikliği'],
          ai_commentary: analysisResult.ai_commentary || 'CV analizi tamamlandı.'
        };
        
        // Analiz sonucunu kaydet
        await Application.findByIdAndUpdate(application._id, {
          analysis: validatedResult,
          matchScore: validatedResult.final_score,
          isAnalyzed: true,
          analyzedAt: new Date()
        });
        
        // Becerileri çıkar
        let skills = [];
        if (Array.isArray(analysisResult.skills)) {
          skills = analysisResult.skills;
        } else if (cv.content) {
          // Beceriler eksikse içerikten çıkarmaya çalış
          const commonSkills = [
            'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 
            'Python', 'Django', 'Flask', 'Java', 'Spring', 'PHP', 'Laravel', 'Ruby',
            'HTML', 'CSS', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker'
          ];
          skills = commonSkills.filter(skill => 
            new RegExp(`\\b${skill}\\b`, 'i').test(cv.content)
          ).slice(0, 5); // En fazla 5 beceri
        }
        
        // Sonuçları döndürülecek listeye ekle
        analyzeResults.push({
          applicationId: application._id,
          candidateId: application.candidate?._id,
          candidateName: application.candidate?.name || 'İsim yok',
          cvId: cv._id,
          cvTitle: cv.title || 'CV Başlığı yok',
          
          // Puanlar
          matchScore: validatedResult.final_score,
          technicalScore: validatedResult.final_technical_score,
          hrScore: validatedResult.final_hr_score,
          
          // Detaylı puanlar
          technicalDetailsScores: {
            technicalSkillsScore: validatedResult.technical_skills_score,
            projectExperienceScore: validatedResult.project_experience_score, 
            problemSolvingScore: validatedResult.problem_solving_score,
            learningAgilityScore: validatedResult.learning_agility_score,
          },
          
          hrDetailsScores: {
            communicationScore: validatedResult.communication_score,
            teamworkScore: validatedResult.teamwork_score,
            motivationScore: validatedResult.motivation_score,
            adaptabilityScore: validatedResult.adaptability_score,
          },
          
          // İçerik
          skills: skills,
          strengths: validatedResult.strengths,
          weaknesses: validatedResult.weaknesses,
          recommendation: validatedResult.general_recommendation,
          evaluation: validatedResult.ai_commentary,
          
          analyzedAt: new Date()
        });
        
        console.log(`Başvuru ${application._id} analiz edildi.`);
      } catch (error) {
        console.error(`Başvuru analizi hatası, ID: ${application._id}`, error);
        // Hatayı yakalayıp diğer başvurularla devam etmek için
        
        // Hatalı analizleri de listeye ekle ancak hata durumu belirt
        if (application.cv) {
          analyzeResults.push({
            applicationId: application._id,
            candidateId: application.candidate?._id,
            candidateName: application.candidate?.name || 'İsim yok',
            cvId: application.cv._id,
            cvTitle: application.cv.title || 'CV Başlığı yok',
            
            // Varsayılan puanlar
            matchScore: 50,
            technicalScore: 50,
            hrScore: 50,
            
            // Hata durumu
            error: true,
            errorMessage: error.message || 'Analiz sırasında hata oluştu',
            
            // İçerik
            skills: [],
            strengths: ['Belirlenemedi'],
            weaknesses: ['Belirlenemedi'],
            recommendation: 'Analiz sırasında hata oluştu, manuel değerlendirme gerekli',
            evaluation: 'CV analizi tamamlanamadı. Lütfen manuel olarak değerlendirin.'
          });
        }
      }
    }
    
    // Sonuçları eşleşme puanına göre sırala
    return analyzeResults.sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('Batch CV analizi hatası:', error);
    throw new Error(`Toplu CV analizi sırasında bir hata oluştu: ${error.message}`);
  }
};

module.exports = {
  matchCVWithJob,
  matchCVWithAllJobs,
  matchJobWithAllCVs,
  getTopMatchingJobsForUser,
  getTopMatchingCVsForJob,
  getRecommendedJobsForUser,
  analyzeAllApplicationsForJob
}; 