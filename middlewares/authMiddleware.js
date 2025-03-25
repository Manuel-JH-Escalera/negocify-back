const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

// Middleware para proteger rutas
const protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si se proporcionó un token en los headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Verificar si existe un token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No estás autorizado para acceder a esta ruta",
      });
    }

    try {
      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar el usuario
      const usuario = await Usuario.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: "El usuario no existe",
        });
      }

      // Agregar el usuario al request
      req.user = usuario;
      next();
    } catch (error) {
      console.error("Error en verificación de token:", error);
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      });
    }
  } catch (error) {
    console.error("Error en middleware de autenticación:", error);
    res.status(500).json({
      success: false,
      message: "Error en la autenticación",
      error: error.message,
    });
  }
};

module.exports = { protect };
