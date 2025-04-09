// models/Producto.js
const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Producto extends Model {
    static associate(models) {
      this.belongsTo(models.TipoProducto, {
        foreignKey: "tipo_producto_id",
        as: "tipoProducto",
      });
      this.belongsTo(models.Almacen, {
        foreignKey: "almacen_id",
        as: "almacen",
      });
    }
  }

  Producto.init(
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
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "tipo_producto",
          key: "id",
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      stock_minimo: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      almacen_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "almacen",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Producto",
      tableName: "producto",
      timestamps: false,
    }
  );

  return Producto;
};
