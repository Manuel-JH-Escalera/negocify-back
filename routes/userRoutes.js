const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");

// Todas las rutas de usuarios están protegidas
router.use(protect);

// Definir rutas para usuarios
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
