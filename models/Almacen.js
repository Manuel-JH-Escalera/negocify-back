const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Almacen = sequelize.define(
  "almacen",
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
    timestamps: false,
    tableName: "almacen",
  }
);

module.exports = Almacen;
