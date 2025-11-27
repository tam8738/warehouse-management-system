const { Sequelize } = require('sequelize');

// Khởi tạo kết nối PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'warehouse_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false, // Tắt log SQL
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Kiểm tra kết nối
sequelize
  .authenticate()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Unable to connect to database:', err));

module.exports = sequelize;
