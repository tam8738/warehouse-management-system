require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./models');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const supplierRoutes = require('./routes/suppliers');
const productRoutes = require('./routes/products');
const inboundRoutes = require('./routes/inbound');
const outboundRoutes = require('./routes/outbound');
const inventoryRoutes = require('./routes/inventory');
const reportRoutes = require('./routes/reports');
const stockRoutes = require('./routes/stock');
const warehouseRoutes = require('./routes/warehouses');
const locationRoutes = require('./routes/locations');
const qcRoutes = require('./routes/qc');
const putawayRoutes = require('./routes/putaway');

// Import middleware
const { auth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware =====
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } })); // HTTP logging


// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/notifications', auth, notificationRoutes);
app.use('/api/suppliers', auth, supplierRoutes);
app.use('/api/products', auth, productRoutes);
app.use('/api/inbound', auth, inboundRoutes);
app.use('/api/outbound', auth, outboundRoutes);
app.use('/api/inventory', auth, inventoryRoutes);
app.use('/api/reports', auth, reportRoutes);
app.use('/api/stock', auth, stockRoutes);
app.use('/api/warehouses', auth, warehouseRoutes);
app.use('/api/locations', auth, locationRoutes);
app.use('/api/qc', auth, qcRoutes);
app.use('/api/putaway', auth, putawayRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===== Database Sync & Start Server =====
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('✅ Database connected successfully');

    // Sync models (use { alter: true } in development, avoid in production)
    if (process.env.NODE_ENV === 'development') {
     // await db.sequelize.sync({ alter: true });
      await db.sequelize.sync({ alter: false });
      logger.info('✅ Database models synchronized');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// ===== Graceful Shutdown =====
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

module.exports = app;