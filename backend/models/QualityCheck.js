module.exports = (sequelize, DataTypes) => {
  const QualityCheck = sequelize.define(
    'QualityCheck',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      qcNo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Mã phiếu kiểm tra chất lượng'
      },
      inboundId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Liên kết với phiếu nhập kho'
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      expectedQty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Số lượng dự kiến'
      },
      receivedQty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Số lượng thực nhận'
      },
      acceptedQty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Số lượng đạt chuẩn'
      },
      rejectedQty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Số lượng không đạt'
      },
      damagedQty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Số lượng hư hỏng'
      },
      qcResult: {
        type: DataTypes.ENUM('pending', 'passed', 'failed', 'partial'),
        defaultValue: 'pending',
        comment: 'Kết quả kiểm tra: pending/passed/failed/partial'
      },
      qcBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Người kiểm tra'
      },
      qcDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Ngày kiểm tra'
      },
      defectTypes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        comment: 'Loại lỗi: ["damaged", "expired", "wrong_item", "poor_quality"]'
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        comment: 'Ảnh chứng minh lỗi'
      },
      notes: {
        type: DataTypes.TEXT,
        comment: 'Ghi chú về kết quả kiểm tra'
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'quality_checks',
      timestamps: true,
    }
  );

  QualityCheck.associate = (models) => {
    // QC belongs to InboundHeader
    QualityCheck.belongsTo(models.InboundHeader, {
      foreignKey: 'inboundId',
      as: 'inbound'
    });

    // QC belongs to Product
    QualityCheck.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    // QC belongs to User (inspector)
    QualityCheck.belongsTo(models.User, {
      foreignKey: 'qcBy',
      as: 'inspector'
    });

    // QC has many Putaway tasks
    QualityCheck.hasMany(models.Putaway, {
      foreignKey: 'qcId',
      as: 'putawayTasks'
    });
  };

  return QualityCheck;
};