module.exports = (sequelize, DataTypes) => {
  const BinStock = sequelize.define(
    'BinStock',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      binId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Số lô (nếu manage batch)'
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      reservedQty: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Số lượng đã reserved'
      },
      allocatedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày đưa vào vị trí'
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Hạn sử dụng'
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'bin_stocks',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['binId', 'productId', 'batchNo']
        }
      ]
    }
  );

  BinStock.associate = (models) => {
    // BinStock belongs to Bin
    BinStock.belongsTo(models.Bin, {
      foreignKey: 'binId',
      as: 'bin'
    });

    // BinStock belongs to Product
    BinStock.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // BinStock belongs to Batch
    BinStock.belongsTo(models.Batch, {
      foreignKey: 'batchNo',
      targetKey: 'batchNo',
      as: 'batch'
    });
  };

  return BinStock;
};