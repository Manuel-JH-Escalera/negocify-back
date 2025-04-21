const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
    class Venta extends Model {
        static associate(models) {
            this.belongsTo(models.TipoVenta, {
                foreignKey: 'tipo_venta_id',
                as: 'tipoVenta'
            });
            this.belongsTo(models.Almacen, {
                foreignKey: 'almacen_id',
                as: 'almacen'
            });
        }
    }

    Venta.init(
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },
            monto_bruto: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            monto_neto: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: true,
            },
            fecha: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            almacen_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'almacen',
                    key: 'id',
                },
            },
            tipo_venta_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'tipo_venta',
                    key: 'id',
                },
            },
        },
        {
            sequelize,
            modelName: 'Venta',
            tableName: 'venta',
            timestamps: false,
        }
    );

    return Venta;
}