const {
  Usuario,
  Almacen,
  Rol,
  UsuarioRolAlmacen,
  AdministradoresSistema,
} = require("../models");

const getUserPermissions = async (usuarioId) => {
  try {
    const esAdmin = await AdministradoresSistema.findOne({
      where: { usuario_id: usuarioId },
    });
    const esAdminSistema = !!esAdmin;

    let almacenesUsuario = [];

    if (esAdminSistema) {
      const todosLosAlmacenes = await Almacen.findAll({
        attributes: ["id", "nombre", "direccion"],
        order: [["nombre", "ASC"]],
      });
      almacenesUsuario = todosLosAlmacenes.map((almacen) => ({
        id: almacen.id,
        nombre: almacen.nombre,
        direccion: almacen.direccion,
        rol: "Administrador Sistema",
        rolId: -1,
      }));
    } else {
      const permisos = await UsuarioRolAlmacen.findAll({
        where: { usuario_id: usuarioId },
        include: [
          {
            model: Almacen,
            as: "Almacen",
            attributes: ["id", "nombre", "direccion"],
            required: true, // Cambiado temp a false para incluir almacenes sin permisos
          },
          {
            model: Rol,
            as: "Rol",
            attributes: ["id", "nombre"],
            required: true, // Cambiado temp a false para incluir roles sin permisos
          },
        ],
        order: [[{ model: Almacen, as: "Almacen" }, "nombre", "ASC"]],
      });

      almacenesUsuario = permisos
        .filter((p) => p.Almacen && p.Rol)
        .map((p) => ({
          id: p.Almacen.id,
          nombre: p.Almacen.nombre,
          direccion: p.Almacen.direccion,
          rol: p.Rol.nombre,
          rolId: p.Rol.id,
        }));
    }

    return {
      esAdminSistema,
      almacenes: almacenesUsuario,
    };
  } catch (error) {
    console.error("Error al obtener permisos de usuario:", error);
    throw new Error("No se pudieron obtener los permisos del usuario.");
  }
};

module.exports = { getUserPermissions };
