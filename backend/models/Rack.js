module.exports = (sequelize, DataTypes) => {
  const Rack = sequelize.define(
    'Rack',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      aisleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Mã kệ (VD: R01, R02)'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tên kệ'
      },
      sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Thứ tự trên dãy'
      },
      levels: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: 'Số tầng/level'
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
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'damaged'),
        defaultValue: 'active',
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'racks',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['aisleId', 'code']
        }
      ]
    }
  );

  Rack.associate = (models) => {
    // Rack belongs to Aisle
    Rack.belongsTo(models.Aisle, {
      foreignKey: 'aisleId',
      as: 'aisle'
    });

    // Rack has many Bins
    Rack.hasMany(models.Bin, {
      foreignKey: 'rackId',
      as: 'bins',
      onDelete: 'CASCADE'
    });
  };

  return Rack;
};