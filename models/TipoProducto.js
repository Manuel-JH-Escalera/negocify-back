const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class TipoProducto extends Model {
    static associate(models) {
      this.hasMany(models.Producto, {
        foreignKey: "tipo_producto_id",
        as: "productos",
      });
    }
  }

  TipoProducto.init(
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
    },
    {
      sequelize,
      modelName: "TipoProducto",
      tableName: "tipo_producto",
      timestamps: false,
    }
  );

  return TipoProducto;
};
