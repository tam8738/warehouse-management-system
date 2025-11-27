module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define(
    'Stock',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      reservedQty: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
    },
    {
      tableName: 'stock',
      timestamps: true,
    }
  );

  Stock.associate = (models) => {
    
    Stock.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return Stock;
};
