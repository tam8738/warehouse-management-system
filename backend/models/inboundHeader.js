module.exports = (sequelize, DataTypes) => {
  const InboundHeader = sequelize.define(
    'InboundHeader',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inboundNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      poNo: {
        type: DataTypes.STRING,
      },
      receivedDate: {
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
      tableName: 'inbound_headers',
      timestamps: true,
    }
  );


  InboundHeader.associate = (models) => {
   
    InboundHeader.belongsTo(models.Supplier, {
      foreignKey: 'supplierId',
      as: 'supplier',
    });

    InboundHeader.hasMany(models.InboundDetail, {
      foreignKey: 'headerId',
      as: 'details',
      onDelete: 'CASCADE',
    });
  };

  return InboundHeader;
};
