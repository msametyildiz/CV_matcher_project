const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  matchScore: Number,
  technical_skills_score: Number,
  project_experience_score: Number,
  problem_solving_score: Number,
  learning_agility_score: Number,
  communication_score: Number,
  teamwork_score: Number,
  motivation_score: Number,
  adaptability_score: Number,
  final_technical_score: Number,
  final_hr_score: Number,
  education: {
    level: String,
    match: Number
  },
  experience: {
    years: String,
    match: Number
  },
  languages: [String],
  general_recommendation: String,
  strengths: [String],
  weaknesses: [String],
  detailed_evaluation: String
}, { _id: false });

const ApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cv: { type: mongoose.Schema.Types.ObjectId, ref: 'CV', required: true },
  status: { type: String, default: 'pending' },
  note: String,
  appliedAt: { type: Date, default: Date.now },
  analysis: AnalysisSchema
});

module.exports = mongoose.model('Application', ApplicationSchema);
