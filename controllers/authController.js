const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

// Generar un JWT
const generateToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Registro de un nuevo usuario
const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico ya está registrado",
      });
    }

    // Crear el nuevo usuario
    const usuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      telefono,
    });

    // Generar token
    const token = generateToken(usuario);

    // Responder sin incluir la contraseña
    const { password: _, ...usuarioSinPassword } = usuario.toJSON();

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        usuario: usuarioSinPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

// Inicio de sesión
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar el usuario por email
    const usuario = await Usuario.findOne({ where: { email } });

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Verificar contraseña
    const isPasswordValid = await usuario.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Generar token
    const token = generateToken(usuario);

    // Responder sin incluir la contraseña
    const { password: _, ...usuarioSinPassword } = usuario.toJSON();

    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        usuario: usuarioSinPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

// Obtener información del usuario actual
const getMe = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener información del usuario",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
