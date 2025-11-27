module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("success", "warning", "error", "info"),
        allowNull: false,
        defaultValue: "info",
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      relatedId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "ID của entity liên quan (inbound, outbound, etc.)"
      },
      relatedType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Loại entity (inbound, outbound, inventory, etc.)"
      }
    },
    {
      tableName: "notifications",
      timestamps: true,
      indexes: [
        {
          fields: ['userId', 'isRead']
        },
        {
          fields: ['createdAt']
        }
      ]
    }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Notification;
};