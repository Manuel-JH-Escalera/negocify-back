const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const Usuario = require("./Usuario");
const Rol = require("./Rol");
const Almacen = require("./Almacen");

const UsuarioRolAlmacen = sequelize.define(
  "usuario_rol_almacen",
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
        model: Usuario,
        key: "id",
      },
    },
    almacen_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Almacen,
        key: "id",
      },
    },
    rol_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Rol,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
    tableName: "usuario_rol_almacen",
  }
);

// Definir relaciones
Usuario.belongsToMany(Almacen, {
  through: UsuarioRolAlmacen,
  foreignKey: "usuario_id",
  otherKey: "almacen_id",
});

Almacen.belongsToMany(Usuario, {
  through: UsuarioRolAlmacen,
  foreignKey: "almacen_id",
  otherKey: "usuario_id",
});

Usuario.belongsToMany(Rol, {
  through: UsuarioRolAlmacen,
  foreignKey: "usuario_id",
  otherKey: "rol_id",
});

Rol.belongsToMany(Usuario, {
  through: UsuarioRolAlmacen,
  foreignKey: "rol_id",
  otherKey: "usuario_id",
});

Almacen.belongsToMany(Rol, {
  through: UsuarioRolAlmacen,
  foreignKey: "almacen_id",
  otherKey: "rol_id",
});

Rol.belongsToMany(Almacen, {
  through: UsuarioRolAlmacen,
  foreignKey: "rol_id",
  otherKey: "almacen_id",
});

module.exports = UsuarioRolAlmacen;
