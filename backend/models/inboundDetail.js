module.exports = (sequelize, DataTypes) => {
  const InboundDetail = sequelize.define(
    'InboundDetail',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      headerId: {
        // Foreign key để khớp với InboundHeader (quan hệ 1-n)
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
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      manufactureDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      expDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'inbound_details',
      timestamps: false, // Vì bạn đã có createdAt rồi
    }
  );

  // ===== Associations =====
  InboundDetail.associate = (models) => {
    // Association: InboundDetail belongs to InboundHeader (quan hệ n-1, nhiều details thuộc về một header)
    // Alias 'header' được sử dụng để tránh trùng với alias khác trong hệ thống.
    InboundDetail.belongsTo(models.InboundHeader, {
      foreignKey: 'headerId',
      as: 'header',
    });

    // Association: InboundDetail belongs to Product (quan hệ n-1, nhiều details thuộc về một product)
    // Alias 'product' được sử dụng để tránh trùng với alias 'product' trong model Stock (belongsTo).
    InboundDetail.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    // Association: InboundDetail belongs to Batch (quan hệ n-1, nếu quản lý lô, nối bằng batchNo)
    // Alias 'batch' được sử dụng để tránh trùng với alias khác trong hệ thống.
    InboundDetail.belongsTo(models.Batch, {
      foreignKey: 'batchNo',
      targetKey: 'batchNo', // Nối bằng batchNo
      as: 'batch',
    });
  };

  return InboundDetail;
};
