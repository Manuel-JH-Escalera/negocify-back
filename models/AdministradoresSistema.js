const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class AdministradoresSistema extends Model {
    static associate(models) {
      this.belongsTo(models.Usuario, {
        foreignKey: "usuario_id",
        as: "usuario",
      });
    }
  }

  AdministradoresSistema.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
        references: {
          model: "usuario",
          key: "id",
        },
      },
      fecha_creacion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AdministradoresSistema",
      tableName: "administradores_sistema",
      timestamps: false,
    }
  );

  return AdministradoresSistema;
};
