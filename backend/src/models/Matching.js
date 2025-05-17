const mongoose = require('mongoose');

const MatchingSchema = new mongoose.Schema({
  cv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Eşleştirme skoru
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  
  // Kullanılan ağırlıklar
  weightingUsed: {
    technicalWeight: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    hrWeight: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },
  
  // Detaylı skorlar
  // Teknik Skorlar
  technical_skills_score: {
    type: Number,
    min: 0,
    max: 100
  },
  project_experience_score: {
    type: Number,
    min: 0,
    max: 100
  },
  problem_solving_score: {
    type: Number,
    min: 0,
    max: 100
  },
  learning_agility_score: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // İK Skorları
  communication_score: {
    type: Number,
    min: 0,
    max: 100
  },
  teamwork_score: {
    type: Number,
    min: 0,
    max: 100
  },
  motivation_score: {
    type: Number,
    min: 0,
    max: 100
  },
  adaptability_score: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Toplamalar
  final_technical_score: {
    type: Number,
    min: 0,
    max: 100
  },
  final_hr_score: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Ek değerlendirmeler
  language_level_score: {
    type: Number,
    min: 0,
    max: 100
  },
  general_recommendation: {
    type: String,
    enum: ['Görüşmeye çağrılabilir', 'Teknik değerlendirilmeli', 'Uygun değil']
  },
  strengths: [String],
  weaknesses: [String],
  ai_commentary: String,
  
  // Eşleştirme zamanı
  matchedAt: {
    type: Date,
    default: Date.now
  },
  
  // Eşleştirme durumu
  status: {
    type: String,
    enum: ['pending', 'viewed', 'contacted', 'rejected', 'archived'],
    default: 'pending'
  },
  
  // Özel notlar
  notes: {
    type: String
  },
  
  // Zamanlama
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date, 
    default: Date.now
  }
}, {
  timestamps: true
});

// CV ve iş ilanı için benzersiz indeks
MatchingSchema.index({ cv: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Matching', MatchingSchema); 