const jwt = require("jsonwebtoken");
const { Usuario, AdministradoresSistema, UsuarioRolAlmacen, Rol, Almacen } = require("../models");
const { getUserPermissions } = require("../utils/permissionHelper");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No estás autorizado para acceder a esta ruta (No hay token)",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!Usuario || typeof Usuario.findByPk !== "function") {
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor (modelo no válido).",
      });
    }

    const usuarioActual = await Usuario.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: UsuarioRolAlmacen,
          as: "RolAlmacenEntries",
          include: [
            {
              model: Almacen,
              as: "Almacen",
              attributes: ["id", "nombre", "direccion"],
            },
            {
              model: Rol,
              as: "Rol",
              attributes: ["id", "nombre"],
            },
          ],
        },
      ],
      logging: console.log,  // Esto imprime las consultas SQL generadas
    });
    
    
    if (!usuarioActual) {
      return res.status(401).json({
        success: false,
        message: "El usuario perteneciente a este token ya no existe.",
      });
    }

    const permisos = await getUserPermissions(decoded.id);


    req.user = {
      ...usuarioActual.toJSON(),
      Roles: usuarioActual.RolAlmacenEntries.map((rolAlmacenEntry) => rolAlmacenEntry.Rol?.nombre),
      almacenIds: usuarioActual.RolAlmacenEntries.map((rolAlmacenEntry) => rolAlmacenEntry.Almacen?.id),
      
      ...permisos,
    };
    next();
  } catch (error) {
    let message = "Token inválido o expirado";
    if (error.message === "No se pudieron obtener los permisos del usuario.") {
      message = "Error al cargar los permisos del usuario.";
    } else if (error.name === "JsonWebTokenError") {
      message = "Token inválido.";
    } else if (error.name === "TokenExpiredError") {
      message = "Token expirado.";
    }
    console.error("Error en middleware protect:", error);
    return res.status(401).json({
      success: false,
      message: message,
    });
  }
};

const requireAdmin = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const esAdminSistema = await AdministradoresSistema.findOne({
      where: { usuario_id: userId },
    });
    if (esAdminSistema) {
      return next(); 
    }


    const adminRol = await Rol.findOne({
      where: { nombre: "administrador" },
    });
    if (!adminRol) {
      return res.status(403).json({
        success: false,
        message: "Rol de administrador no encontrado.",
      });
    }

    const isAdminAlmacen = await UsuarioRolAlmacen.findOne({
      where: {
        usuario_id: userId,
        rol_id: adminRol.id,
      },
    });

    if (!isAdminAlmacen) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Solo los administradores tienen acceso a esta página.",
      });
    }

    // Si pasa cualquiera de las dos verificaciones
    return next();
  } catch (error) {
    console.error("Error en requireAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor.",
    });
  }
};


module.exports = { 
  protect,
  requireAdmin 
};
