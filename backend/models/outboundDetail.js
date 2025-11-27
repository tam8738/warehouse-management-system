module.exports = (sequelize, DataTypes) => {
  const OutboundDetail = sequelize.define(
    'OutboundDetail',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      outboundId: {
        // ✅ khớp với index.js (đừng đặt headerId)
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNo: {
        type: DataTypes.STRING,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'outbound_details',
      timestamps: true, // ✅ đồng bộ với toàn hệ thống
    }
  );

  // ===== Associations =====
  OutboundDetail.associate = (models) => {
    OutboundDetail.belongsTo(models.OutboundHeader, {
      foreignKey: 'outboundId', // ✅ phải trùng với header
      as: 'header',
    });

    OutboundDetail.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return OutboundDetail;
};
