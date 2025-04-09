const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Almacen extends Model {
    static associate(models) {
      this.belongsToMany(models.Usuario, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "almacen_id",
        otherKey: "usuario_id",
        as: "Usuarios",
      });

      this.belongsToMany(models.Rol, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "almacen_id",
        otherKey: "rol_id",
        as: "Roles",
      });

      this.hasMany(models.Producto, {
        foreignKey: "almacen_id",
        as: "Productos",
      });

      this.hasMany(models.UsuarioRolAlmacen, {
        foreignKey: "almacen_id",
        as: "UsuarioRolEntries",
      });
    }
  }

  Almacen.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      direccion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Almacen",
      tableName: "almacen",
      timestamps: false,
    }
  );

  return Almacen;
};
