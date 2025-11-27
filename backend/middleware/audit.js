const { v4: uuidv4 } = require('uuid');
const db = require('../models'); // Sequelize models

const auditLog = async (req, res, next) => {
  try {
    const auditData = {
      id: uuidv4(),
      userId: req.user?.id || 'system',
      action: req.method,
      endpoint: req.originalUrl,
      ip: req.ip,
      timestamp: new Date(),
      body: JSON.stringify(req.body),
    };

    console.log('📝 Audit Log:', auditData);

    // ===== Uncomment để lưu vào database =====
    // await db.AuditLog.create(auditData);

    next();
  } catch (err) {
    console.error('Audit Log Error:', err);
    next();
  }
};

module.exports = { auditLog };
