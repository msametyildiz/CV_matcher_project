const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');
const errorHandler = require('./middlewares/error.middleware');

// Upload klasörlerini oluştur
const uploadsDir = path.join(__dirname, '../uploads');
const cvsDir = path.join(uploadsDir, 'cvs');

// Dizinlerin var olup olmadığını kontrol et, yoksa oluştur
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Uploads directory created');
}

if (!fs.existsSync(cvsDir)) {
  fs.mkdirSync(cvsDir);
  console.log('CVs directory created');
}

// Routes importları
const authRoutes = require('./routes/auth.routes');
const cvRoutes = require('./routes/cv.routes');
const jobRoutes = require('./routes/job.routes');
const matchingRoutes = require('./routes/matching.routes');

// Express app
const app = express();

// Database bağlantısı
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS yapılandırması
const corsOptions = {
  origin: function (origin, callback) {
    // Frontend URL'den gelen isteklere veya origin olmayan isteklere (yani, aynı kaynaktan) izin ver
    // Development ortamında köken kontrolünü devre dışı bırakabilirsiniz, ama production'da dikkat!
    const allowedOrigins = [config.frontendURL, 'http://localhost:3000'];
    const originIsAllowed = !origin || allowedOrigins.includes(origin);
    
    if (originIsAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Upload klasörüne erişim için statik dosyalar
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matching', matchingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('CV-MatchGPT API çalışıyor');
});

// Error handling middleware
app.use(errorHandler);

// Server başlatma
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server ${PORT} numaralı portta çalışıyor`);
});

// Beklenmeyen hata yakalama
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
}); 