const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// ===== Initialize Sequelize Connection =====
const sequelize = new Sequelize(
  process.env.DB_NAME || 'warehouse_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ===== Import All Models =====
db.User = require('./user')(sequelize, DataTypes);
db.Supplier = require('./supplier')(sequelize, DataTypes);
db.Product = require('./product')(sequelize, DataTypes);
db.Stock = require('./stock')(sequelize, DataTypes);
db.Batch = require('./batch')(sequelize, DataTypes);
db.InboundHeader = require('./inboundHeader')(sequelize, DataTypes);
db.InboundDetail = require('./inboundDetail')(sequelize, DataTypes);
db.OutboundHeader = require('./outboundHeader')(sequelize, DataTypes);
db.OutboundDetail = require('./outboundDetail')(sequelize, DataTypes);
db.InventorySession = require('./inventorySession')(sequelize, DataTypes);
db.InventoryCount = require('./inventoryCount')(sequelize, DataTypes);
db.Notification = require('./Notification')(sequelize, Sequelize.DataTypes);
db.Warehouse = require('./Warehouse')(sequelize, DataTypes);
db.Zone = require('./Zone')(sequelize, DataTypes);
db.Aisle = require('./Aisle')(sequelize, DataTypes); // FIXED: Added Aisle
db.Rack = require('./Rack')(sequelize, DataTypes);
db.Bin = require('./Bin')(sequelize, DataTypes);
db.BinStock = require('./BinStock')(sequelize, DataTypes);
db.QualityCheck = require('./QualityCheck')(sequelize, DataTypes);
db.Putaway = require('./Putaway')(sequelize, DataTypes);

// ===== Setup Associations =====
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

module.exports = db;