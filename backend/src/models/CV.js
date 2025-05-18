const mongoose = require('mongoose');

const CVSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: String,
  filePath: String,
  content: String,
  education: String,
  experience: String,
  skills: [String],
  languages: [String],
  isPrimary: { type: Boolean, default: false },
  uploadDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('CV', CVSchema);
