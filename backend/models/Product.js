// backend/models/Product.js
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sku: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING,
      },
      barcode: {
        type: DataTypes.STRING,
      },
      manageBatch: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
      // ⭐ THÊM MỚI: Ngưỡng cảnh báo tồn kho thấp
      minStockLevel: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 10,
        allowNull: false,
        comment: 'Ngưỡng cảnh báo tồn kho tối thiểu'
      },
    },
    {
      tableName: 'products',
      timestamps: true,
    }
  );

  Product.associate = (models) => {
    Product.hasMany(models.InboundDetail, { foreignKey: 'productId', as: 'inboundDetails' });
    Product.hasMany(models.OutboundDetail, { foreignKey: 'productId', as: 'outboundDetails' });
    Product.hasMany(models.InventoryCount, { foreignKey: 'productId', as: 'inventoryCounts' });
    Product.hasOne(models.Stock, { foreignKey: 'productId', as: 'stock' });
    Product.hasMany(models.Batch, { foreignKey: 'productId', as: 'batches' });
  };

  return Product;
};