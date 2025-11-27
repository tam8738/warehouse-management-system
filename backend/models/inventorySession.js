module.exports = (sequelize, DataTypes) => {
  const InventorySession = sequelize.define(
    'InventorySession',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inventoryNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      checkDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      checker: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
        defaultValue: 'draft',
      },
      notes: {
        type: DataTypes.TEXT,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'inventory_sessions',
      timestamps: true,
    }
  );

  // ===== Associations =====
  InventorySession.associate = (models) => {
    // 1 phiên kiểm kê có nhiều bản ghi chi tiết kiểm kê
    InventorySession.hasMany(models.InventoryCount, {
      foreignKey: 'sessionId',
      as: 'counts',
    });

    // Phiên kiểm kê được tạo bởi 1 người dùng
    InventorySession.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  };

  return InventorySession;
};
