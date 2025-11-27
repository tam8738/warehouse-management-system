module.exports = (sequelize, DataTypes) => {
  const Putaway = sequelize.define(
    'Putaway',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      putawayNo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Mã phiếu putaway'
      },
      qcId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Liên kết với QC'
      },
      inboundId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Liên kết với phiếu nhập'
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Số lượng cần đưa vào kho'
      },
      fromLocation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Vị trí staging/receiving'
      },
      toBinId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Vị trí đích trong kho'
      },
      suggestedBinId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Vị trí gợi ý bởi hệ thống'
      },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal',
        comment: 'Độ ưu tiên'
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Người được giao nhiệm vụ'
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời gian bắt đầu thực hiện'
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời gian hoàn thành'
      },
      status: {
        type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'putaways',
      timestamps: true,
      indexes: [
        {
          fields: ['status', 'priority']
        },
        {
          fields: ['assignedTo']
        }
      ]
    }
  );

  Putaway.associate = (models) => {
    // Putaway belongs to QualityCheck
    Putaway.belongsTo(models.QualityCheck, {
      foreignKey: 'qcId',
      as: 'qualityCheck'
    });

    // Putaway belongs to InboundHeader
    Putaway.belongsTo(models.InboundHeader, {
      foreignKey: 'inboundId',
      as: 'inbound'
    });

    // Putaway belongs to Product
    Putaway.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // Putaway belongs to Bin (destination)
    Putaway.belongsTo(models.Bin, {
      foreignKey: 'toBinId',
      as: 'destinationBin'
    });

    // Putaway belongs to Bin (suggested)
    Putaway.belongsTo(models.Bin, {
      foreignKey: 'suggestedBinId',
      as: 'suggestedBin'
    });

    // Putaway belongs to User (assigned worker)
    Putaway.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'worker'
    });
  };

  return Putaway;
};