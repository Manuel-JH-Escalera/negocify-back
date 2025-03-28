const express = require("express");
const router = express.Router();
const productRoutes = require("./productRoutes");
router.use("/productos", productRoutes);
module.exports = router;

// Importar rutas específicas
const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");

// Definir rutas principales
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Ruta de verificación de API
router.get("/status", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date(),
  });
});

module.exports = router;
