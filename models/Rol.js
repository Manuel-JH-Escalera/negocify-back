const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Rol extends Model {
    static associate(models) {
      this.belongsToMany(models.Usuario, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "rol_id",
        otherKey: "usuario_id",
        as: "Usuarios",
      });

      this.belongsToMany(models.Almacen, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "rol_id",
        otherKey: "almacen_id",
        as: "Almacenes",
      });

      this.hasMany(models.UsuarioRolAlmacen, {
        foreignKey: "rol_id",
        as: "UsuarioAlmacenEntries",
      });
    }
  }

  Rol.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Rol",
      tableName: "rol",
      timestamps: false,
    }
  );

  return Rol;
};
