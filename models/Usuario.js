const { DataTypes, Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  class Usuario extends Model {
    async comparePassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    static associate(models) {
      this.hasOne(models.AdministradoresSistema, {
        foreignKey: "usuario_id",
        as: "administradorSistema",
      });

      this.belongsToMany(models.Almacen, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "usuario_id",
        otherKey: "almacen_id",
        as: "Almacenes",
      });

      this.belongsToMany(models.Rol, {
        through: models.UsuarioRolAlmacen,
        foreignKey: "usuario_id",
        otherKey: "rol_id",
        as: "Roles",
      });

      this.hasMany(models.UsuarioRolAlmacen, {
        foreignKey: "usuario_id",
        as: "RolAlmacenEntries",
      });
    }
  }

  Usuario.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      apellido: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: "El correo electrónico debe tener un formato válido",
          },
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Usuario",
      tableName: "usuario",
      timestamps: false,
      hooks: {
        beforeCreate: async (usuario) => {
          if (usuario.password) {
            const salt = await bcrypt.genSalt(10);
            usuario.password = await bcrypt.hash(usuario.password, salt);
          }
        },
        beforeUpdate: async (usuario) => {
          if (usuario.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            usuario.password = await bcrypt.hash(usuario.password, salt);
          }
        },
      },
    }
  );

  return Usuario;
};
