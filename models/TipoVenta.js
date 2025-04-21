const {  DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class TipoVenta extends Model {
        static associate(models) {
            this.hasMany(models.Venta, {
                foreignKey: 'tipo_venta_id',
                as: 'ventas',
            });
        }
    }

    TipoVenta.init(
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
            comision: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            }, 
        },
        {
            sequelize,
            modelName: 'TipoVenta',
            tableName: 'tipo_venta',
            timestamps: false,
        }
    );

    return TipoVenta;
};