const { Usuario, Rol, Almacen, UsuarioRolAlmacen } = require("../models");
const { Op } = require("sequelize");

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {

    const { roles, almacenIds } = req.user;
    const esAdminSistema = roles.includes("AdministradoresSistema");

    let usuarios;

    if (esAdminSistema) {
      // Si es administrador del sistema, obtener todos los usuarios
      usuarios = await Usuario.findAll({
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Rol,
            as: 'Roles',  
            through: { attributes: [] }, 
          },
          {
            model: Almacen,
            as: 'Almacenes',  
            through: { attributes: [] }, 
          },
        ],
      });
    } else {
      usuarios = await Usuario.findAll({
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Rol,
            as: 'Roles',
            through: { attributes: [] },
          },
          {
            model: Almacen,
            as: 'Almacenes',
            where: {
              id: { [Op.in]: almacenIds },
            },
            required: true, 
            through: { attributes: [] },
          },
        ],
      });
      
    }
    

    res.status(200).json({
      success: true,
      count: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los usuarios",
      error: error.message,
    });
  }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Rol,
          through: { attributes: [] }, 
        },
        {
          model: Almacen,
          through: { attributes: [] }, 
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: `Usuario con ID ${id} no encontrado`,
      });
    }

    res.status(200).json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el usuario",
      error: error.message,
    });
  }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, roles, almacenes } =
      req.body;

      const esAdmin = req.user.roles.includes("administrador");
      const puedeEditar = almacenes?.every(id => req.user.almacenIds.includes(id));

      if (!esAdmin || !puedeEditar) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para crear un usuario en este almacén",
        });
      }

    // Verificar que el email no esté ya registrado
    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico ya está registrado",
      });
    }

    // Crear el usuario
    const usuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      telefono,
    });

    if (roles && almacenes && roles.length > 0 && almacenes.length > 0) {
      const rolesDb = await Rol.findAll({ where: { id: roles } });
      const almacenesDb = await Almacen.findAll({ where: { id: almacenes } });

      if (rolesDb.length !== roles.length) {
        await usuario.destroy(); 
        return res.status(400).json({
          success: false,
          message: "Uno o más roles no existen",
        });
      }

      if (almacenesDb.length !== almacenes.length) {
        await usuario.destroy(); 
        return res.status(400).json({
          success: false,
          message: "Uno o más almacenes no existen",
        });
      }

      // Crear las relaciones usuario-rol-almacén
      const relaciones = [];
      for (const almacen of almacenes) {
        for (const rol of roles) {
          relaciones.push({
            usuario_id: usuario.id,
            almacen_id: almacen,
            rol_id: rol,
          });
        }
      }

      await UsuarioRolAlmacen.bulkCreate(relaciones);
    }

    // Obtener el usuario con sus relaciones
    const usuarioConRelaciones = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Rol,
          through: { attributes: [] },
        },
        {
          model: Almacen,
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: usuarioConRelaciones,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear el usuario",
      error: error.message,
    });
  }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, password, telefono, roles, almacenes } =
      req.body;

    // Verificar si el usuario existe
    let usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: `Usuario con ID ${id} no encontrado`,
      });
    }

    const esAdmin = req.user.roles.includes("administrador");
    const puedeEditar = almacenes?.every(id => req.user.almacenIds.includes(id));

    if (!esAdmin || !puedeEditar) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para editar este usuario en este almacén",
      });
    }

    // Si se actualiza el email, verificar que no esté en uso por otro usuario
    if (email && email !== usuario.email) {
      const existingUser = await Usuario.findOne({
        where: {
          email,
          id: { [Op.ne]: id }, // Excluir el usuario actual de la búsqueda
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "El correo electrónico ya está en uso por otro usuario",
        });
      }
    }

    // Actualizar el usuario
    await usuario.update({
      nombre: nombre || usuario.nombre,
      apellido: apellido || usuario.apellido,
      email: email || usuario.email,
      password: password ? password : undefined, // Solo actualizar si se proporciona
      telefono: telefono !== undefined ? telefono : usuario.telefono,
    });

    // Si se proporcionan roles y almacenes, actualizar las relaciones
    if (roles && almacenes && roles.length > 0 && almacenes.length > 0) {
      // Eliminar relaciones anteriores
      await UsuarioRolAlmacen.destroy({
        where: { usuario_id: id },
      });

      // Verificar que los roles y almacenes existan
      const rolesDb = await Rol.findAll({ where: { id: roles } });
      const almacenesDb = await Almacen.findAll({ where: { id: almacenes } });

      if (rolesDb.length !== roles.length) {
        return res.status(400).json({
          success: false,
          message: "Uno o más roles no existen",
        });
      }

      if (almacenesDb.length !== almacenes.length) {
        return res.status(400).json({
          success: false,
          message: "Uno o más almacenes no existen",
        });
      }

      // Crear las nuevas relaciones
      const relaciones = [];
      for (const almacen of almacenes) {
        for (const rol of roles) {
          relaciones.push({
            usuario_id: id,
            almacen_id: almacen,
            rol_id: rol,
          });
        }
      }

      await UsuarioRolAlmacen.bulkCreate(relaciones);
    }

    // Obtener el usuario actualizado con sus relaciones
    const usuarioActualizado = await Usuario.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: UsuarioRolAlmacen,
          as: "RolAlmacenEntries",
          include: [
            {
              model: Almacen,
              as: "Almacen",  // Alias para la relación con Almacen
              attributes: ["id", "nombre", "direccion"],
            },
            {
              model: Rol,
              as: "Rol",  // Alias para la relación con Rol
              attributes: ["id", "nombre"],
            },
          ],
        },
      ],
      logging: console.log, 
    });
    
    res.status(200).json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: usuarioActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el usuario",
      error: error.message,
    });
  }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: `Usuario con ID ${id} no encontrado`,
      });
    }

    const esAdmin = req.user.roles.includes("administrador");
    const almacenesDelUsuario = usuario.almacenes.map((almacen) => almacen.id);
    const puedeEliminar = almacenesDelUsuario.every(id => req.user.almacenIds.includes(id));

    if (!esAdmin || !puedeEliminar) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No tienes permiso para eliminar este usuario.",
      });
    }

    // Eliminar las relaciones del usuario
    await UsuarioRolAlmacen.destroy({
      where: { usuario_id: id },
    });

    // Eliminar el usuario
    await usuario.destroy();

    res.status(200).json({
      success: true,
      message: "Usuario eliminado exitosamente",
      data: { id },
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el usuario",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
