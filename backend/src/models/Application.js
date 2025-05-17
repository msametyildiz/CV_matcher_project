const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
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
  cv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'rejected', 'shortlisted', 'interview', 'offer', 'hired'],
    default: 'pending'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// İndeksler
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema); 