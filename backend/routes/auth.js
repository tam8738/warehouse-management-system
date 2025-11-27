const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ===== Middleware auth =====
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Không có token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// ===== Register =====
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Thiếu username hoặc password" });
  }

  try {
    const existing = await db.User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const newUser = await db.User.create({ 
      username, 
      password,
      fullName: username,
      role: 'staff', // Default role
      status: 'active'
    });
    
    res.status(201).json({
      message: "Đăng ký thành công",
      user: { 
        id: newUser.id, 
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Đăng ký thất bại" });
  }
});

// ===== Login =====
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.User.findOne({ where: { username } });
    if (!user) return res.status(400).json({ message: "Tên đăng nhập không tồn tại" });

    // Kiểm tra status
    if (user.status !== 'active') {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    // So sánh password (nếu đã hash thì dùng bcrypt, nếu chưa hash thì so sánh trực tiếp)
    let isMatch = false;
    if (user.password.startsWith('$2')) {
      // Password đã được hash
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Password chưa hash (test data)
      isMatch = password === user.password;
    }
    
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

    // Tạo token với đầy đủ thông tin
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { 
        id: user.id, 
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Đăng nhập thất bại" });
  }
});

// ===== Me =====
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    res.json({ 
      id: user.id, 
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lấy thông tin user thất bại" });
  }
});

module.exports = router;