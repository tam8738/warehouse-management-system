module.exports = (sequelize, DataTypes) => {
  const Aisle = sequelize.define(
    'Aisle',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      zoneId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Mã dãy kệ (VD: A01, A02)'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tên dãy kệ'
      },
      sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Thứ tự trong zone'
      },
      width: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Chiều rộng (m)'
      },
      length: {
        type: DataTypes.DECIMAL(10, 2),
        comment: 'Chiều dài (m)'
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
      tableName: 'aisles',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['zoneId', 'code']
        }
      ]
    }
  );

  Aisle.associate = (models) => {
    // Aisle belongs to Zone
    Aisle.belongsTo(models.Zone, {
      foreignKey: 'zoneId',
      as: 'zone'
    });

    // Aisle has many Racks
    Aisle.hasMany(models.Rack, {
      foreignKey: 'aisleId',
      as: 'racks',
      onDelete: 'CASCADE'
    });
  };

  return Aisle;
};