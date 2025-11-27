module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define(
    'Supplier',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contact: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: {
            msg: 'Email không hợp lệ.',
          },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      taxCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'suppliers',
      timestamps: true,
      indexes: [
        { fields: ['name'] },
      ],
    }
  );

  // ===== Associations =====
  Supplier.associate = (models) => {
    // Supplier có nhiều phiếu nhập (InboundHeader)
    Supplier.hasMany(models.InboundHeader, {
      foreignKey: 'supplierId',
      as: 'inbounds',
    });

    // Supplier có nhiều lô hàng (Batch)
    Supplier.hasMany(models.Batch, {
      foreignKey: 'supplierId',
      as: 'batches',
    });
  };

  return Supplier;
};
