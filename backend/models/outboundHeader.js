module.exports = (sequelize, DataTypes) => {
  const OutboundHeader = sequelize.define(
    'OutboundHeader',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      outboundNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      customer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      soNo: {
        type: DataTypes.STRING,
      },
      deliveryDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
      },
    },
    {
      tableName: 'outbound_headers',
      timestamps: true,
    }
  );

  // ===== Associations =====
  OutboundHeader.associate = (models) => {
    // OutboundHeader ↔ OutboundDetail
    OutboundHeader.hasMany(models.OutboundDetail, {
      foreignKey: 'outboundId', // ✅ khớp với index.js
      as: 'details',
    });

    // OutboundHeader ↔ User (createdBy)
    OutboundHeader.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  };

  return OutboundHeader;
};
