const mongoose = require('mongoose');

const CVSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx'],
    required: true
  },
  content: {
    type: String // Çıkarılan ham CV içeriği
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // GPT Analiz sonuçları
  analysis: {
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
    final_score: {
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
    
    // Meta veriler
    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
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

// Kullanıcının primary CV'sini ayarlamak için hook
CVSchema.pre('save', async function(next) {
  try {
    if (this.isPrimary) {
      // Kullanıcının mevcut primary CV'sini bul ve güncelle
      await this.constructor.updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isPrimary: false } }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('CV', CVSchema); 