const { OpenAI } = require('openai');
const config = require('../config/config');

// OpenAI API istemcisi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || config.openaiApiKey
});

/**
 * Sadece CV içeriğini göndererek analiz yapma
 * @param {string} cvContent - CV'nin metin içeriği
 * @returns {Promise<Object>} - GPT analiz sonucu
 */
async function analyzeCVContent(cvContent) {
  try {
    console.log('Using OpenAI API key:', process.env.OPENAI_API_KEY ? 'From env' : 'From config');
    
    const completion = await openai.chat.completions.create({
      model: config.gptModel || "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: config.cvAnalysisPrompt 
        },
        { 
          role: "user", 
          content: `Analyze the following CV. Use a technical_weight of 70 (default). CV Content: ${cvContent}` 
        }
      ],
      temperature: 0.2, // Daha deterministik cevaplar için düşük sıcaklık
      response_format: { type: "json_object" } // JSON formatında yanıt isteyelim
    });

    // Response'dan JSON çıkarma
    const responseText = completion.choices[0].message.content;
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('GPT yanıtı JSON olarak ayrıştırılamadı:', parseError);
      // JSON yanıtı ayrıştırılamadıysa, ham yanıtı döndürüp başka yerde işlenebilir
      return { error: 'GPT yanıtı JSON olarak ayrıştırılamadı', rawResponse: responseText };
    }
  } catch (error) {
    console.error('OpenAI API hatası:', error);
    throw new Error(`CV analizi sırasında hata: ${error.message}`);
  }
}

/**
 * CV ve İş İlanı eşleştirmesi yaparak analiz yapma
 * @param {string} cvContent - CV'nin metin içeriği
 * @param {Object} job - İş ilanı bilgileri
 * @returns {Promise<Object>} - Eşleştirme sonuçları
 */
async function matchCVWithJob(cvContent, job) {
  try {
    // Ağırlık değerlerini al
    const technicalWeight = job.matchingWeights?.technicalWeight || 70;
    const hrWeight = job.matchingWeights?.hrWeight || 30;

    const jobDetails = `
    Job Title: ${job.title}
    Company: ${job.company}
    Location: ${job.location}
    Description: ${job.description}
    Requirements: ${job.requirements ? job.requirements.join(', ') : ''}
    Responsibilities: ${job.responsibilities ? job.responsibilities.join(', ') : ''}
    Employment Type: ${job.employmentType}
    Experience Level: ${job.experienceLevel}
    `;

    const completion = await openai.chat.completions.create({
      model: config.gptModel || "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: config.cvAnalysisPrompt
        },
        { 
          role: "user", 
          content: `Analyze how well the following CV matches the job description. Use a technical_weight of ${technicalWeight} and hr_weight of ${hrWeight}.
          
          Job Description:
          ${jobDetails}
          
          CV Content:
          ${cvContent}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" } // JSON formatında yanıt isteyelim
    });

    // Response'dan JSON çıkarma
    const responseText = completion.choices[0].message.content;
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('GPT eşleştirme yanıtı JSON olarak ayrıştırılamadı:', parseError);
      return { error: 'GPT yanıtı JSON olarak ayrıştırılamadı', rawResponse: responseText };
    }
  } catch (error) {
    console.error('OpenAI API eşleştirme hatası:', error);
    throw new Error(`CV-İş eşleştirme analizi sırasında hata: ${error.message}`);
  }
}

/**
 * CV ve İş ilanını analiz edip gelişmiş hata yönetimiyle sonuçları döndürür
 * @param {string} cvContent - CV'nin metin içeriği 
 * @param {Object} jobDetails - İş detayları (başlık, açıklama, gereksinimler vb.)
 * @returns {Promise<Object>} - Analiz sonuçları
 */
async function analyzeCV(cvContent, jobDetails) {
  try {
    console.log('OpenAI API ile CV analizi başlıyor...');
    console.log('API Anahtarı kontrol ediliyor:', process.env.OPENAI_API_KEY ? 'Mevcut' : 'Eksik');
    console.log('CV içerik uzunluğu:', cvContent ? cvContent.length : 0);
    console.log('İş detayları:', jobDetails.title);
    
    if (!cvContent || cvContent.length < 100) {
      throw new Error('CV içeriği çok kısa veya boş');
    }
    
    // İş detaylarını formatlama
    const formattedJobDetails = `
    Job Title: ${jobDetails.title || 'Not specified'}
    Company: ${jobDetails.company || 'Not specified'}
    Description: ${jobDetails.description || 'Not specified'}
    Requirements: ${jobDetails.requirements ? jobDetails.requirements.join(', ') : 'Not specified'}
    `;
    
    // GPT-4 prompt'u
    const prompt = config.cvAnalysisPrompt;
    
    // API çağrısı
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: prompt 
        },
        { 
          role: "user", 
          content: `Job Description:\n${formattedJobDetails}\n\nCV:\n${cvContent}` 
        }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" } // JSON formatında yanıt isteyelim
    });
    
    // Yanıtı alıp işle
    const responseText = completion.choices[0].message.content;
    console.log('API yanıt aldı, işleniyor...');
    
    try {
      const analysisResult = JSON.parse(responseText);
      
      // Gerekli alanların var olup olmadığını kontrol et
      const requiredFields = ['final_score', 'final_technical_score', 'final_hr_score', 'ai_commentary'];
      const missingFields = requiredFields.filter(field => !analysisResult[field]);
      
      if (missingFields.length > 0) {
        console.warn(`Eksik alanlar tespit edildi: ${missingFields.join(', ')}`);
        
        // Eksik alanları varsayılan değerlerle doldur
        missingFields.forEach(field => {
          if (field === 'final_score') analysisResult.final_score = 70;
          if (field === 'final_technical_score') analysisResult.final_technical_score = 70;
          if (field === 'final_hr_score') analysisResult.final_hr_score = 65;
          if (field === 'ai_commentary') analysisResult.ai_commentary = 'CV analizi tamamlandı';
        });
      }
      
      // Sonucu düzenle ve döndür
      return {
        success: true,
        analysis: analysisResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (parseError) {
      console.error('JSON ayrıştırma hatası:', parseError);
      console.error('Ham yanıt:', responseText);
      
      return {
        success: false,
        error: 'JSON ayrıştırma hatası',
        rawResponse: responseText,
        message: parseError.message
      };
    }
  } catch (error) {
    console.error('OpenAI API çağrısında hata:', error);
    return {
      success: false,
      error: 'API hatası',
      message: error.message
    };
  }
}

module.exports = {
  analyzeCVContent,
  matchCVWithJob,
  analyzeCV
}; 