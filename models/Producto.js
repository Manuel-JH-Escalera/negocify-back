const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// Si decides crear el archivo tipoProducto.js, importa aquí
const TipoProducto = require("./TipoProducto");

const Producto = sequelize.define(
  "producto",
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
    tipo_producto_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stock_minimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: "producto",
  }
);

Producto.belongsTo(TipoProducto, { foreignKey: "tipo_producto_id", as: "tipoProducto" });

module.exports = Producto;
