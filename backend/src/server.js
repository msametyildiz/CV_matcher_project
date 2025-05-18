const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas bağlantısı başarılı'))
  .catch(err => console.error('❌ MongoDB Atlas bağlantı hatası:', err));

// API Rotaları
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/job', require('./routes/job.routes'));
app.use('/api/cv', require('./routes/cv.routes'));
app.use('/api/matching', require('./routes/matching.routes'));

// Uploads klasörü için statik dosya sunumu
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Hata yönetimi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Sunucu hatası!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor`));
