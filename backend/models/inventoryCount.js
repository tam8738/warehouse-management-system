module.exports = (sequelize, DataTypes) => {
  const InventoryCount = sequelize.define(
    'InventoryCount',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      systemQty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      actualQty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      difference: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      countedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'inventory_counts',
      timestamps: false,
      // Tự động tính difference mỗi khi lưu
      hooks: {
        beforeSave: (count) => {
          count.difference = count.actualQty - count.systemQty;
        },
      },
    }
  );

  // ===== Associations =====
  InventoryCount.associate = (models) => {
    // Association: InventoryCount belongs to InventorySession (quan hệ n-1, nhiều counts thuộc về một session)
    // Alias 'session' được sử dụng để tránh trùng với alias khác trong hệ thống.
    InventoryCount.belongsTo(models.InventorySession, {
      foreignKey: 'sessionId',
      as: 'session',
    });

    // Association: InventoryCount belongs to Product (quan hệ n-1, nhiều counts liên quan đến một product)
    // Alias 'product' được sử dụng để tránh trùng với alias 'product' trong model Batch (belongsTo).
    InventoryCount.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return InventoryCount;
};
