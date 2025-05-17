const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  responsibilities: [String],
  
  // Eşleştirme ağırlıkları
  matchingWeights: {
    technicalWeight: {
      type: Number,
      default: 70, // Varsayılan olarak %70 teknik, %30 İK
      min: 0,
      max: 100
    },
    hrWeight: {
      type: Number,
      min: 0,
      max: 100,
      default: function() {
        return 100 - this.matchingWeights.technicalWeight;
      }
    }
  },
  
  // İş ilanı detayları
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid-level', 'senior', 'executive'],
    required: true
  },
  salaryRange: {
    min: {
      type: Number
    },
    max: {
      type: Number
    },
    currency: {
      type: String,
      default: 'TRY'
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  
  // İlan durumu
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'active'
  },
  
  applicationDeadline: {
    type: Date
  },
  
  // İstatistikler
  viewCount: {
    type: Number,
    default: 0
  },
  applicationsCount: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('Job', JobSchema); 