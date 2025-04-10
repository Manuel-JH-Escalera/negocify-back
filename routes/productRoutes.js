const express = require("express");
const router = express.Router();
const { Producto, TipoProducto } = require("../models");
const {
  checkUserPermissionForWarehouse,
} = require("../utils/permissionChecker");
const { protect } = require("../middlewares/authMiddleware");

// Obtener todas las categorías (TipoProducto)
router.get("/tipo_producto", async (req, res) => {
  try {
    const categorias = await TipoProducto.findAll();
    res.json(categorias);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

// grab los productos
router.get("/", protect, async (req, res) => {
  try {
    const requestedAlmacenId = req.query.almacen_id;

    if (!requestedAlmacenId) {
      return res.status(400).json({
        success: false,
        message: "El parámetro 'almacen_id' es requerido.",
      });
    }

    const rolesPermitidos = ["administrador", "empleado"];

    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      requestedAlmacenId
    );

    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado a los productos de este almacén.",
      });
    }

    const productos = await Producto.findAll({
      where: {
        almacen_id: requestedAlmacenId, // Filtrar por el almacén verificado
      },
      include: [
        { model: TipoProducto, as: "tipoProducto", attributes: ["nombre"] },
      ],
      order: [["nombre", "ASC"]],
    });

    res.json(productos);
  } catch (error) {
    console.error("Error al traer los productos:", error);
    res.status(500).json({ message: "Error interno al traer los productos" });
  }
});

// crear producto nuevo
router.post("/", async (req, res) => {
  try {
    const { nombre, tipo_producto_id, stock, stock_minimo, almacen_id } =
      req.body;

    const nuevoProducto = await Producto.create({
      nombre,
      tipo_producto_id,
      stock,
      stock_minimo,
      almacen_id,
    });
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error("Error al crear el producto:", error);
    res.status(500).json({ message: "Error al crear el producto" });
  }
});

// editar producto
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo_producto_id, stock, stock_minimo } = req.body; // Eliminamos almacen_id

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await producto.update({ nombre, tipo_producto_id, stock, stock_minimo }); // Aseguramos que stock_minimo se actualice
    res.json(producto);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product" });
  }
});

// eliminar producto
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await producto.destroy();
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
});
module.exports = router;
