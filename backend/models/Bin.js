module.exports = (sequelize, DataTypes) => {
  const Bin = sequelize.define(
    'Bin',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      rackId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Mã vị trí đầy đủ (VD: WH-HN-A-01-R01-L01-B01)'
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tầng/Level (1, 2, 3...)'
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Vị trí trên tầng (1, 2, 3...)'
      },
      barcode: {
        type: DataTypes.STRING,
        unique: true,
        comment: 'Barcode của vị trí'
      },
      capacity: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Sức chứa (số lượng SKU hoặc pallet)'
      },
      currentQty: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Số lượng hiện tại'
      },
      maxWeight: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Tải trọng tối đa (kg)'
      },
      width: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Chiều rộng (m)'
      },
      height: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Chiều cao (m)'
      },
      depth: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Chiều sâu (m)'
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Sản phẩm đang chứa (nếu dedicated location)'
      },
      status: {
        type: DataTypes.ENUM('empty', 'partial', 'full', 'reserved', 'blocked', 'damaged'),
        defaultValue: 'empty',
        comment: 'Trạng thái vị trí'
      },
      type: {
        type: DataTypes.ENUM('storage', 'picking', 'packing', 'staging', 'quarantine'),
        defaultValue: 'storage',
        comment: 'Loại vị trí'
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'bins',
      timestamps: true,
      indexes: [
        {
          fields: ['rackId', 'level', 'position']
        },
        {
          fields: ['productId']
        },
        {
          fields: ['status']
        }
      ]
    }
  );

  Bin.associate = (models) => {
    // Bin belongs to Rack
    Bin.belongsTo(models.Rack, {
      foreignKey: 'rackId',
      as: 'rack'
    });

    // Bin can contain Product
    Bin.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // Bin has many BinStocks (chi tiết tồn kho từng vị trí)
    Bin.hasMany(models.BinStock, {
      foreignKey: 'binId',
      as: 'stocks'
    });
  };

  return Bin;
};