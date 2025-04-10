const express = require("express");
const router = express.Router();

// Importar rutas específicas
const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");

// Definir rutas principales
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/productos", productRoutes);

// Ruta de verificación de API
router.get("/status", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date(),
  });
});

module.exports = router;
