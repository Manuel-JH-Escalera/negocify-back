const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UsuarioRolAlmacen extends Model {
    static associate(models) {
      this.belongsTo(models.Usuario, {
        foreignKey: "usuario_id",
        as: "Usuario",
      });
      this.belongsTo(models.Almacen, {
        foreignKey: "almacen_id",
        as: "Almacen",
      });
      this.belongsTo(models.Rol, {
        foreignKey: "rol_id",
        as: "Rol",
      });
    }
  }

  UsuarioRolAlmacen.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      usuario_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "usuario",
          key: "id",
        },
      },
      almacen_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "almacen",
          key: "id",
        },
      },
      rol_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "rol",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "UsuarioRolAlmacen",
      tableName: "usuario_rol_almacen",
      timestamps: false,
    }
  );

  return UsuarioRolAlmacen;
};
