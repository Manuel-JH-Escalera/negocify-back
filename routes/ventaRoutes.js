const express = require('express');
const router = express.Router();
const { Venta, TipoVenta } = require('../models');
const {
    checkUserPermissionForWarehouse,
} = require("../utils/permissionChecker");
const { protect } = require("../middlewares/authMiddleware");

// Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const ventas = await Venta.findAll({
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['id', 'nombre', 'comision']
        }
      ]
    });
    return res.status(200).json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
});

// Obtener una venta por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await Venta.findByPk(id, {
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['id', 'nombre', 'comision']
        }
      ]
    });
    
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    return res.status(200).json(venta);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
});

// Crear una nueva venta
router.post('/', protect, async (req, res) => {
  try {
    const { tipo_venta_id, monto, fecha, detalles } = req.body;
    
    // Validar campos requeridos
    if (!tipo_venta_id || !monto) {
      return res.status(400).json({ message: 'tipo_venta_id y monto son campos requeridos' });
    }
    
    // Verificar que el tipo de venta exista
    const tipoVenta = await TipoVenta.findByPk(tipo_venta_id);
    if (!tipoVenta) {
      return res.status(404).json({ message: 'El tipo de venta especificado no existe' });
    }
    
    // Crear la venta
    const nuevaVenta = await Venta.create({
      tipo_venta_id,
      monto,
      fecha: fecha || new Date(),
      detalles
    });
    
    // Cargar la venta con su tipo
    const ventaConTipo = await Venta.findByPk(nuevaVenta.id, {
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['id', 'nombre', 'comision']
        }
      ]
    });
    
    return res.status(201).json(ventaConTipo);
  } catch (error) {
    console.error('Error al crear venta:', error);
    return res.status(500).json({ message: 'Error al crear venta', error: error.message });
  }
});

// Actualizar una venta
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_venta_id, monto, fecha, detalles } = req.body;
    
    const venta = await Venta.findByPk(id);
    
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    // Si se está actualizando el tipo de venta, verificar que exista
    if (tipo_venta_id) {
      const tipoVenta = await TipoVenta.findByPk(tipo_venta_id);
      if (!tipoVenta) {
        return res.status(404).json({ message: 'El tipo de venta especificado no existe' });
      }
    }
    
    // Actualizar la venta
    await venta.update({
      tipo_venta_id: tipo_venta_id || venta.tipo_venta_id,
      monto: monto !== undefined ? monto : venta.monto,
      fecha: fecha || venta.fecha,
      detalles: detalles !== undefined ? detalles : venta.detalles
    });
    
    // Cargar la venta actualizada con su tipo
    const ventaActualizada = await Venta.findByPk(id, {
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['id', 'nombre', 'comision']
        }
      ]
    });
    
    return res.status(200).json(ventaActualizada);
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    return res.status(500).json({ message: 'Error al actualizar venta', error: error.message });
  }
});

// Eliminar una venta
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const venta = await Venta.findByPk(id);
    
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    await venta.destroy();
    
    return res.status(200).json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    return res.status(500).json({ message: 'Error al eliminar venta', error: error.message });
  }
});

module.exports = router;