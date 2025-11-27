module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define(
    'Warehouse',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Mã kho (VD: WH-HN, WH-HCM)'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tên kho'
      },
      address: {
        type: DataTypes.TEXT,
        comment: 'Địa chỉ kho'
      },
      city: {
        type: DataTypes.STRING,
        comment: 'Thành phố'
      },
      capacity: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Sức chứa (m²)'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active',
        comment: 'Trạng thái kho'
      },
      type: {
        type: DataTypes.ENUM('main', 'secondary', 'return', 'quarantine'),
        defaultValue: 'main',
        comment: 'Loại kho: chính, phụ, hoàn trả, cách ly'
      },
      managerId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID người quản lý kho'
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'warehouses',
      timestamps: true,
    }
  );

  Warehouse.associate = (models) => {
    // Warehouse has many Zones
    Warehouse.hasMany(models.Zone, {
      foreignKey: 'warehouseId',
      as: 'zones',
      onDelete: 'CASCADE'
    });

    // Warehouse managed by User
    Warehouse.belongsTo(models.User, {
      foreignKey: 'managerId',
      as: 'manager'
    });

    // Warehouse has many Batches
    Warehouse.hasMany(models.Batch, {
      foreignKey: 'warehouseId',
      as: 'batches'
    });
  };

  return Warehouse;
};