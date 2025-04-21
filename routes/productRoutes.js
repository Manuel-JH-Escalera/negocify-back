const express = require("express");
const router = express.Router();
const { Producto, TipoProducto } = require("../models");
const {
  checkUserPermissionForWarehouse,
} = require("../utils/permissionChecker");
const { protect } = require("../middlewares/authMiddleware");
const { Op, col } = require("sequelize");

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

// Obtener productos con bajo stock
router.get("/bajo-stock", protect, async (req, res) => {
  try {
    const requestedAlmacenId = req.query.almacen_id;

    if (!requestedAlmacenId) {
      return res.status(400).json({ message: "almacen_id es requerido" });
    }

    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      ["administrador", "empleado"],
      requestedAlmacenId
    );

    if (!tienePermiso) {
      return res.status(403).json({ message: "Sin permiso" });
    }

    const productos = await Producto.findAll({
      where: {
        almacen_id: requestedAlmacenId,
        stock: {
          [Op.lt]: col("stock_minimo"),
        },
      },
    });

    res.json(productos);
  } catch (err) {
    console.error("Error bajo-stock", err);
    res
      .status(500)
      .json({ message: "Error al obtener productos con bajo stock" });
  }
});

// grab los productos
router.get("/", protect, async (req, res) => {
  try {
    const {
      almacen_id: requestedAlmacenId,
      tipo_producto_id,
      search_name,
      search_sku,
    } = req.query;

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

    const whereClause = {
      almacen_id: requestedAlmacenId,
    };

    if (tipo_producto_id) {
      whereClause.tipo_producto_id = tipo_producto_id;
    }

    if (search_name) {
      whereClause.nombre = {
        [Op.iLike]: `%${search_name}%`,
      };
    }

    if (search_sku) {
      whereClause.sku = {
        [Op.iLike]: `%${search_sku}%`,
      };
    }

    const productos = await Producto.findAll({
      where: whereClause,
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
router.post("/", protect, async (req, res) => {
  try {
    const { nombre, tipo_producto_id, stock, stock_minimo, almacen_id } =
      req.body;
    console.log("parametros que llegan al servidor", {
      nombre,
      tipo_producto_id,
      stock,
      stock_minimo,
      almacen_id,
    });
    if (
      !nombre ||
      !tipo_producto_id ||
      !stock ||
      !stock_minimo ||
      !almacen_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios.",
      });
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
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo_producto_id, stock, stock_minimo } = req.body; // Eliminamos almacen_id

    // validar input
    if (!nombre || !tipo_producto_id || !stock || !stock_minimo) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios.",
      });
    }

    // ver si el producto existe
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // verificar permisos
    const rolesPermitidos = ["administrador", "empleado"];
    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      producto.almacen_id
    );
    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado para editar productos de este almacén.",
      });
    }

    // actualizar producto
    await producto.update({ nombre, tipo_producto_id, stock, stock_minimo }); // Aseguramos que stock_minimo se actualice
    res.json(producto);
  } catch (error) {
    console.error("Error actualizando producto", error);
    res.status(500).json({ message: "Error actualizando producto" });
  }
});

// eliminar producto
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // ver si el producto existe
    const producto = await Producto.findByPk(id);

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // verificar permisos
    const almacenId = producto.almacen_id; // Obtener el ID del almacén del producto
    const rolesPermitidos = ["administrador", "empleado"];
    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      almacenId
    );

    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado para eliminar productos de este almacén.",
      });
    }

    // eliminar producto
    await producto.destroy();
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    res.status(500).json({ message: "Error al eliminar el producto" });
  }
});
module.exports = router;
