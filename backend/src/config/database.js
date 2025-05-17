const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('MongoDB bağlantısı başarısız:', error.message);
    // Uygulama çökmesi durumunda
    process.exit(1);
  }
};

module.exports = connectDB; 