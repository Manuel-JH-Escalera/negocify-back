const express = require("express");
const router = express.Router();
const { Producto, TipoProducto } = require("../models");

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
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: TipoProducto, as: "tipoProducto", attributes: ["nombre"] },
      ],
    });
    res.json(productos);
  } catch (error) {
    console.error("Error al traer los productos:", error);
    res.status(500).json({ message: "Error al traer los productos" });
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
