const User = require('../models/User');
const authUtils = require('../utils/auth.utils');

/**
 * Kullanıcı kaydı
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Giriş verileri kontrolü
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen tüm alanları doldurun'
      });
    }

    // Email format kontrolü
    if (!authUtils.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz email formatı'
      });
    }

    // Şifre kontrolü
    if (!authUtils.validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Email benzersizliği kontrolü
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Rol kontrolü
    const validRoles = ['candidate', 'employer', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'candidate';

    // Kullanıcı oluştur
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      company: userRole === 'employer' ? req.body.company || {} : {}
    });

    if (user) {
      // Token oluştur
      const token = authUtils.generateToken(user._id);

      // Cevap döndür
      res.status(201).json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı verileri'
      });
    }
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Kullanıcı girişi
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Giriş verileri kontrolü
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen email ve şifre girin'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });

    // Kullanıcı ve şifre kontrolü
    if (user && (await user.matchPassword(password))) {
      // Token oluştur
      const token = authUtils.generateToken(user._id);

      // Cevap döndür
      res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Geçerli kullanıcı bilgilerini getir
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          profileImage: user.profileImage
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Kullanıcı profili güncelleme
 * @route PUT /api/auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Temel bilgileri güncelle
      user.name = req.body.name || user.name;

      // Email değişikliği kontrolü
      if (req.body.email && req.body.email !== user.email) {
        // Email benzersizliği kontrolü
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Bu email adresi zaten kullanılıyor'
          });
        }
        
        user.email = req.body.email;
      }

      // Şifre güncellemesi
      if (req.body.password) {
        // Şifre kontrolü
        if (!authUtils.validatePassword(req.body.password)) {
          return res.status(400).json({
            success: false,
            message: 'Şifre en az 6 karakter olmalıdır'
          });
        }
        
        user.password = req.body.password;
      }

      // İşveren bilgilerini güncelle
      if (user.role === 'employer' && req.body.company) {
        user.company.name = req.body.company.name || user.company.name;
        user.company.position = req.body.company.position || user.company.position;
        user.company.website = req.body.company.website || user.company.website;
      }

      // Kullanıcıyı kaydet
      const updatedUser = await user.save();

      // Yeni token oluştur
      const token = authUtils.generateToken(updatedUser._id);

      // Cevap döndür
      res.json({
        success: true,
        token,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          company: updatedUser.company,
          profileImage: updatedUser.profileImage
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Şifre sıfırlama isteği
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen email adresinizi girin'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Bu email adresiyle kayıtlı kullanıcı bulunamadı'
      });
    }

    // Sıfırlama token'ı oluştur
    const resetToken = authUtils.generateResetToken();
    
    // Token'ın hash'ini kaydet
    user.resetPasswordToken = authUtils.hashResetToken(resetToken);
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 dakika
    
    await user.save();

    // Gerçek uygulamada email gönderilmeli, şimdilik token döndürelim
    res.json({
      success: true,
      message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi',
      resetToken // Gerçek uygulamada bu token dışarıya verilmemeli!
    });
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Şifre sıfırlama
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen tüm alanları doldurun'
      });
    }

    // Şifre kontrolü
    if (!authUtils.validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Token'ın hash'ini hesapla
    const hashedToken = authUtils.hashResetToken(token);

    // Token ile kullanıcıyı bul
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş token'
      });
    }

    // Yeni şifre ata
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Cevap döndür
    res.json({
      success: true,
      message: 'Şifre başarıyla sıfırlandı'
    });
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

/**
 * Google ile kimlik doğrulama
 * @route POST /api/auth/google
 * @access Public
 */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID Token gerekli'
      });
    }

    // Token'ı doğrula ve kullanıcı bilgisini al
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(require('../config/config').googleClientId);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: require('../config/config').googleClientId
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Kullanıcı mevcut mu kontrol et
    let user = await User.findOne({ email });

    if (!user) {
      // Yeni kullanıcı oluştur
      // Rastgele şifre oluştur (kullanıcı hiçbir zaman bununla giriş yapmayacak)
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      user = await User.create({
        name,
        email,
        password,
        role: req.body.role || 'candidate', // Frontend'den rol bilgisi gelebilir
        profileImage: picture
      });
    }

    // Token oluştur
    const token = authUtils.generateToken(user._id);

    // Cevap döndür
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        profileImage: user.profileImage || picture
      }
    });
  } catch (error) {
    console.error('Google auth hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Google ile giriş sırasında bir hata oluştu'
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  googleAuth
}; 