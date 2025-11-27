const express = require('express');
const db = require('../models');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ===== GET: Lấy tất cả notifications của user =====
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, isRead } = req.query;
    
    const whereClause = { userId: req.user.id };
    if (isRead !== undefined) {
      whereClause.isRead = isRead === 'true';
    }

    const notifications = await db.Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const unreadCount = await db.Notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({
      data: notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
  }
});

// ===== POST: Tạo notification mới (cho admin/system) =====
router.post('/', auth, async (req, res) => {
  try {
    const { userId, title, message, type, relatedId, relatedType } = req.body;

    // Chỉ admin hoặc system có thể tạo notification cho user khác
    const targetUserId = userId || req.user.id;

    const notification = await db.Notification.create({
      userId: targetUserId,
      title,
      message,
      type: type || 'info',
      relatedId,
      relatedType
    });

    res.status(201).json({ data: notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Lỗi khi tạo thông báo' });
  }
});

// ===== PATCH: Đánh dấu đã đọc =====
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    await notification.update({ isRead: true });
    res.json({ data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu đã đọc' });
  }
});

// ===== PATCH: Đánh dấu tất cả đã đọc =====
router.patch('/read-all', auth, async (req, res) => {
  try {
    await db.Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );

    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu đã đọc' });
  }
});

// ===== DELETE: Xóa một notification =====
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    await notification.destroy();
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
  }
});

// ===== DELETE: Xóa tất cả notifications =====
router.delete('/', auth, async (req, res) => {
  try {
    await db.Notification.destroy({
      where: { userId: req.user.id }
    });

    res.json({ message: 'Đã xóa tất cả thông báo' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
  }
});

module.exports = router;