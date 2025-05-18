const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: String,
  isRemote: Boolean,
  description: String,
  requirements: [String],
  responsibilities: [String],
  benefits: [String],
  employmentType: String,
  experienceLevel: String,
  salaryMin: Number,
  salaryMax: Number,
  salaryCurrency: String,
  salaryPeriod: String,
  applicationDeadline: Date,
  status: { type: String, default: 'active' },
  applicationsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  candidateAnalysis: { type: Map, of: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('Job', JobSchema);
