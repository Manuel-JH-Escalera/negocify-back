const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");
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

module.exports = { protect };
