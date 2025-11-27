module.exports = (sequelize, DataTypes) => {
  const Zone = sequelize.define(
    'Zone',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Mã khu vực (VD: ZONE-A, ZONE-B)'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tên khu vực'
      },
      type: {
        type: DataTypes.ENUM('storage', 'picking', 'packing', 'receiving', 'shipping', 'quarantine'),
        defaultValue: 'storage',
        comment: 'Loại khu vực'
      },
      temperature: {
        type: DataTypes.ENUM('ambient', 'cold', 'frozen'),
        defaultValue: 'ambient',
        comment: 'Nhiệt độ: thường, lạnh, đông'
      },
      capacity: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Sức chứa (m²)'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active',
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'zones',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['warehouseId', 'code']
        }
      ]
    }
  );

  Zone.associate = (models) => {
    // Zone belongs to Warehouse
    Zone.belongsTo(models.Warehouse, {
      foreignKey: 'warehouseId',
      as: 'warehouse'
    });

    // Zone has many Aisles
    Zone.hasMany(models.Aisle, {
      foreignKey: 'zoneId',
      as: 'aisles',
      onDelete: 'CASCADE'
    });
  };

  return Zone;
};