const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { detect } = require('langdetect');

/**
 * PDF dosyasından metni çıkarma
 * @param {string} filePath - PDF dosyasının tam yolu
 * @returns {Promise<string>} - Çıkarılan metin
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF okuma hatası:', error);
    throw new Error(`PDF işleme hatası: ${error.message}`);
  }
}

/**
 * DOCX dosyasından metni çıkarma
 * @param {string} filePath - DOCX dosyasının tam yolu 
 * @returns {Promise<string>} - Çıkarılan metin
 */
async function extractTextFromDOCX(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('DOCX okuma hatası:', error);
    throw new Error(`DOCX işleme hatası: ${error.message}`);
  }
}

/**
 * Dosya tipine göre text çıkarma
 * @param {string} filePath - Dosya yolu
 * @param {string} fileType - Dosya tipi (pdf/docx)
 * @returns {Promise<string>} - Çıkarılan metin
 */
async function extractTextFromFile(filePath, fileType) {
  if (fileType === 'pdf') {
    return extractTextFromPDF(filePath);
  } else if (fileType === 'docx') {
    return extractTextFromDOCX(filePath);
  } else {
    throw new Error(`Desteklenmeyen dosya tipi: ${fileType}`);
  }
}

/**
 * Metnin dilini tespit etme
 * @param {string} text - Tespit edilecek text
 * @returns {string} - Tespit edilen dil kodu (tr, en, vb.)
 */
function detectLanguage(text) {
  try {
    const languages = detect(text);
    if (languages && languages.length > 0) {
      // En yüksek ihtimalli dil
      return languages[0].lang;
    }
    return 'unknown';
  } catch (error) {
    console.error('Dil tespiti hatası:', error);
    return 'unknown';
  }
}

/**
 * CV dosyasını ayrıştırma ve analiz için hazırlama
 * @param {string} filePath - Dosya yolu
 * @param {string} fileType - Dosya tipi
 * @returns {Promise<Object>} - Çıkarılan metin ve meta veriler
 */
async function parseCV(filePath, fileType) {
  try {
    const text = await extractTextFromFile(filePath, fileType);
    const language = detectLanguage(text);
    
    return {
      content: text,
      language,
      wordCount: text.split(/\s+/).length,
      characterCount: text.length
    };
  } catch (error) {
    console.error('CV ayrıştırma hatası:', error);
    throw new Error(`CV ayrıştırma hatası: ${error.message}`);
  }
}

module.exports = {
  parseCV,
  extractTextFromFile,
  detectLanguage
}; 