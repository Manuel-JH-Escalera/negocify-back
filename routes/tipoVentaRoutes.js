const express = require("express");
const router = express.Router();
const { TipoVenta } = require("../models");
const {
  checkUserPermissionForWarehouse,
} = require("../utils/permissionChecker");
const { protect } = require("../middlewares/authMiddleware");

// Obtener todos los tipos de venta
router.get("/", protect, async (req, res) => {
  try {
    const tiposVenta = await TipoVenta.findAll();
    return res.status(200).json(tiposVenta);
  } catch (error) {
    console.error("Error fetching tipos de venta: ", error);
    return res
      .status(500)
      .json({ message: "Error fetching tipos de venta", error: error.message });
  }
});

// Obtener un tipo de venta por ID
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const tipoVenta = await TipoVenta.findByPk(id);

    if (!tipoVenta) {
      return res.status(404).json({ message: "Tipo de venta no encontrado" });
    }

    return res.status(200).json(tipoVenta);
  } catch (error) {
    console.error("Error al obtener tipo de venta:", error);
    return res
      .status(500)
      .json({
        message: "Error al obtener tipo de venta",
        error: error.message,
      });
  }
});

// Crear un nuevo tipo de venta
router.post("/", protect, async (req, res) => {
  try {
    const { nombre, comision } = req.body;

    if (!nombre || comision === undefined) {
      return res
        .status(400)
        .json({ message: "Nombre y comisión son campos requeridos" });
    }

    const rolesPermitidos = ["administrador", "empleado"];
    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      almacen_id
    );

    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado a este almacén.",
      });
    }

    const nuevoTipoVenta = await TipoVenta.create({
      nombre,
      comision,
    });

    return res.status(201).json(nuevoTipoVenta);
  } catch (error) {
    console.error("Error al crear tipo de venta:", error);
    return res
      .status(500)
      .json({ message: "Error al crear tipo de venta", error: error.message });
  }
});

// Actualizar un tipo de venta
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, comision } = req.body;

    const tipoVenta = await TipoVenta.findByPk(id);

    if (!tipoVenta) {
      return res.status(404).json({ message: "Tipo de venta no encontrado" });
    }

    await tipoVenta.update({
      nombre: nombre || tipoVenta.nombre,
      comision: comision !== undefined ? comision : tipoVenta.comision,
    });

    return res.status(200).json(tipoVenta);
  } catch (error) {
    console.error("Error al actualizar tipo de venta:", error);
    return res
      .status(500)
      .json({
        message: "Error al actualizar tipo de venta",
        error: error.message,
      });
  }
});

// Eliminar un tipo de venta
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const tipoVenta = await TipoVenta.findByPk(id);

    if (!tipoVenta) {
      return res.status(404).json({ message: "Tipo de venta no encontrado" });
    }

    await tipoVenta.destroy();

    return res
      .status(200)
      .json({ message: "Tipo de venta eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar tipo de venta:", error);
    return res
      .status(500)
      .json({
        message: "Error al eliminar tipo de venta",
        error: error.message,
      });
  }
});

module.exports = router;
