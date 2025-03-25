// Importaciones
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// Importar configuración de base de datos
const { sequelize, testConnection } = require("./config/database");

// Inicializar la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: process.env.URL_FRONT || "http://localhost:5173", // Cambia esto al puerto donde corre tu app de React
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Probar la conexión a la base de datos
testConnection();

// Rutas
const apiRoutes = require("./routes");
app.use("/api", apiRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.send({
    message: "Bienvenido a la API de Negocify",
    status: "online",
  });
});

// Manejo de errores para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada",
  });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de errores no capturados
process.on("unhandledRejection", (err) => {
  console.log("ERROR NO CAPTURADO: ", err);
  // Cerrar el servidor y salir del proceso
  server.close(() => process.exit(1));
});

module.exports = app;
