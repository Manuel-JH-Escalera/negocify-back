const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TipoProducto = sequelize.define(
  "tipoProducto",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: "tipo_producto",
  }
);

module.exports = TipoProducto;
