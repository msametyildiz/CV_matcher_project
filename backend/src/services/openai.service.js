const { OpenAI } = require('openai');
const config = require('../config/config');

// OpenAI API istemcisi
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

/**
 * Sadece CV içeriğini göndererek analiz yapma
 * @param {string} cvContent - CV'nin metin içeriği
 * @returns {Promise<Object>} - GPT analiz sonucu
 */
async function analyzeCVContent(cvContent) {
  try {
    const completion = await openai.chat.completions.create({
      model: config.gptModel,
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
      model: config.gptModel,
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

module.exports = {
  analyzeCVContent,
  matchCVWithJob
}; 