module.exports = (sequelize, DataTypes) => {
  const Batch = sequelize.define(
    'Batch',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      batchNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      manufactureDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // UPDATED: Changed String to UUID linking to Warehouse
      warehouseId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Warehouse storing this batch'
      },
      warehouse: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Warehouse name (legacy field - will use warehouseId)'
      },
      // NEW: Link to Bin (specific location)
      binId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Specific location in warehouse'
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Location description (legacy field)'
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'recalled', 'depleted'),
        defaultValue: 'active',
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'batches',
      timestamps: true,
      hooks: {
        beforeSave: (batch) => {
          if (batch.quantity === 0) {
            batch.status = 'depleted';
          } else if (batch.expiryDate < new Date()) {
            batch.status = 'expired';
          }
        },
      },
    }
  );

  Batch.associate = (models) => {
    // Product
    Batch.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    // Supplier
    Batch.belongsTo(models.Supplier, {
      foreignKey: 'supplierId',
      as: 'supplier',
    });

    // Warehouse
    Batch.belongsTo(models.Warehouse, {
      foreignKey: 'warehouseId',
      as: 'warehouseInfo',
    });

    // Bin (specific location)
    Batch.belongsTo(models.Bin, {
      foreignKey: 'binId',
      as: 'binLocation',
    });

    // InboundDetails
    Batch.hasMany(models.InboundDetail, {
      foreignKey: 'batchNo',
      sourceKey: 'batchNo',
      as: 'inboundDetails',
    });

    // OutboundDetails
    Batch.hasMany(models.OutboundDetail, {
      foreignKey: 'batchNo',
      sourceKey: 'batchNo',
      as: 'outboundDetails',
    });

    // InventoryCounts
    Batch.hasMany(models.InventoryCount, {
      foreignKey: 'batchNo',
      sourceKey: 'batchNo',
      as: 'inventoryCounts',
    });
  };

  return Batch;
};