const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");


// Todas las rutas de usuarios están protegidas
router.use(protect);

// Definir rutas para usuarios
router.get("/", requireAdmin, userController.getAllUsers);
router.get("/:id", requireAdmin, userController.getUserById);
router.post("/", requireAdmin, userController.createUser);
router.put("/:id", requireAdmin, userController.updateUser);
router.delete("/:id", requireAdmin, userController.deleteUser);
router.post("/createUserAlmacen", requireAdmin, userController.createUser);

module.exports = router;
