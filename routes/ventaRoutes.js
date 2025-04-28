const express = require("express");
const router = express.Router();
const { Venta, TipoVenta, Producto } = require("../models");
const {
  checkUserPermissionForWarehouse,
} = require("../utils/permissionChecker");
const { protect } = require("../middlewares/authMiddleware");
const ExcelJS = require("exceljs");
const { sequelize } = require("../config/database");

router.use((req, res, next) => {
  next();
});

// Obtener todas las ventas de un almacen
router.get("/almacen/:almacenId", protect, async (req, res) => {
  try {
    const { almacenId } = req.params;

    const ventas = await Venta.findAll({
      where: {
        almacen_id: almacenId,
      },
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });
    return res.status(200).json({ data: ventas });
  } catch (error) {
    console.error(
      "Error al obtener ventas del almacén ${req.params.almacenId}:",
      error
    );
    return res.status(500).json({
      message: "Error al obtener ventas del almacén",
      error: error.message,
    });
  }
});

// Obtener una venta por ID
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("ID de venta:", id);
    const venta = await Venta.findByPk(id, {
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });

    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    return res.status(200).json(venta);
  } catch (error) {
    console.error("Error al obtener venta:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener venta", error: error.message });
  }
});

// Crear una nueva venta
router.post("/", protect, async (req, res) => {
  const t = await sequelize.transaction();
  const IVA = 0.19;

  try {
    const { monto_bruto, almacen_id, tipo_venta_id, productos } = req.body;

    if (
      !tipo_venta_id ||
      !almacen_id ||
      monto_bruto === undefined ||
      monto_bruto === null
    ) {
      await t.rollback();
      return res.status(400).json({
        message:
          "tipo_venta_id, almacen_id y monto_bruto son campos requeridos",
      });
    }
    if (typeof monto_bruto !== "number" || monto_bruto <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "monto_bruto debe ser un número positivo" });
    }
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      await t.rollback();
      return res.status(400).json({
        message:
          "El campo 'productos' es requerido y debe ser un array no vacío con { producto_id, cantidad }",
      });
    }
    for (const item of productos) {
      if (
        !item.producto_id ||
        !item.cantidad ||
        typeof item.cantidad !== "number" ||
        item.cantidad <= 0
      ) {
        await t.rollback();
        return res.status(400).json({
          message:
            "Cada item en 'productos' debe tener 'producto_id' y 'cantidad' (número positivo).",
        });
      }
      item.cantidad = Math.floor(item.cantidad);
      if (item.cantidad <= 0) {
        await t.rollback();
        return res.status(400).json({
          message: `La cantidad para el producto ID ${item.producto_id} debe ser mayor a cero.`,
        });
      }
    }

    const rolesPermitidos = ["administrador", "empleado"];
    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      almacen_id
    );

    if (!tienePermiso) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Acceso denegado a este almacén.",
      });
    }

    const tipoVenta = await TipoVenta.findByPk(tipo_venta_id, {
      transaction: t,
    });
    if (!tipoVenta) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "El tipo de venta especificado no existe" });
    }
    const comisionPorcentaje = tipoVenta.comision || 0;

    const productoIds = productos.map((p) => p.producto_id);
    const cantidadRequerida = productos.reduce((acc, p) => {
      acc[p.producto_id] = p.cantidad;
      return acc;
    }, {});

    const productosEncontrados = await Producto.findAll({
      where: {
        id: productoIds,
        almacen_id: almacen_id,
      },
      attributes: ["id", "stock", "nombre"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (productosEncontrados.length !== productoIds.length) {
      const idsEncontrados = new Set(productosEncontrados.map((p) => p.id));
      const idsFaltantes = productoIds.filter((id) => !idsEncontrados.has(id));
      await t.rollback();
      return res.status(404).json({
        message: `Productos no encontrados o no pertenecen al almacén ${almacen_id}: IDs ${idsFaltantes.join(
          ", "
        )}`,
      });
    }

    const productosParaActualizar = [];
    for (const productoDB of productosEncontrados) {
      const cantidadVendida = cantidadRequerida[productoDB.id];
      if (productoDB.stock < cantidadVendida) {
        await t.rollback();
        return res.status(400).json({
          message: `Stock insuficiente para el producto '${productoDB.nombre}' (ID: ${productoDB.id}). Stock actual: ${productoDB.stock}, Cantidad solicitada: ${cantidadVendida}`,
        });
      }
      productosParaActualizar.push({
        producto: productoDB,
        cantidadVendida: cantidadVendida,
      });
    }

    const montoComisionCalculado = monto_bruto * (comisionPorcentaje / 100);
    const valorNetoPreComision = monto_bruto / (1 + IVA);
    const montoNetoCalculado = Math.round(
      valorNetoPreComision - montoComisionCalculado
    );

    if (montoNetoCalculado < 0) {
      await t.rollback();
      return res.status(400).json({
        message: `El cálculo del Monto Neto resultó negativo (${montoNetoCalculado}), verifica el Monto Bruto, IVA y Comisión.`,
        details: {
          montoBruto: monto_bruto,
          ivaRate: IVA,
          comisionPorcentaje: comisionPorcentaje,
          montoComision: montoComisionCalculado,
          valorNetoPreComision: valorNetoPreComision,
        },
      });
    }

    const nuevaVenta = await Venta.create(
      {
        monto_bruto: monto_bruto,
        monto_neto: montoNetoCalculado,
        fecha: new Date(),
        almacen_id,
        tipo_venta_id,
      },
      { transaction: t }
    );

    for (const item of productosParaActualizar) {
      const productoAActualizar = item.producto;
      const nuevaCantidadStock =
        productoAActualizar.stock - item.cantidadVendida;
      productoAActualizar.stock = nuevaCantidadStock;
      await productoAActualizar.save({ transaction: t });
    }

    await t.commit();

    const ventaConTipo = await Venta.findByPk(nuevaVenta.id, {
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });

    return res.status(201).json(ventaConTipo);
  } catch (error) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error("Error durante el rollback:", rollbackError);
      }
    }

    return res.status(500).json({
      message: "Error interno del servidor al crear la venta",
      error: error.message,
    });
  }
});

// Actualizar una venta
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_venta_id, monto, fecha, detalles } = req.body;

    const venta = await Venta.findByPk(id);

    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Si se está actualizando el tipo de venta, verificar que exista
    if (tipo_venta_id) {
      const tipoVenta = await TipoVenta.findByPk(tipo_venta_id);
      if (!tipoVenta) {
        return res
          .status(404)
          .json({ message: "El tipo de venta especificado no existe" });
      }
    }

    // Actualizar la venta
    await venta.update({
      tipo_venta_id: tipo_venta_id || venta.tipo_venta_id,
      monto: monto !== undefined ? monto : venta.monto,
      fecha: fecha || venta.fecha,
      detalles: detalles !== undefined ? detalles : venta.detalles,
    });

    // Cargar la venta actualizada con su tipo
    const ventaActualizada = await Venta.findByPk(id, {
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });

    return res.status(200).json(ventaActualizada);
  } catch (error) {
    console.error("Error al actualizar venta:", error);
    return res
      .status(500)
      .json({ message: "Error al actualizar venta", error: error.message });
  }
});

// Eliminar una venta
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await Venta.findByPk(id);

    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    await venta.destroy();

    return res.status(200).json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar venta:", error);
    return res
      .status(500)
      .json({ message: "Error al eliminar venta", error: error.message });
  }
});

// === RUTAS DE REPORTES ===

//GET /api/ventas/reportes/grafico
router.get("/reportes/grafico", protect, async (req, res) => {
  try {
    const {
      periodo = "mensual",
      anio = new Date().getFullYear(),
      almacenId,
    } = req.query;

    // Obtener todas las ventas con su tipo de venta
    const where = almacenId ? { almacen_id: almacenId } : {};
    const ventas = await Venta.findAll({
      where,
      attributes: ["id", "fecha", "monto", "tipo_venta_id"],
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });

    // filtrar por año
    const fechaInicio = new Date(anio, 0, 1);
    const fechaFin = new Date(anio, 11, 31, 23, 59, 59);

    // Obtener todas las ventas del periodo solicitado
    const ventasFiltradas = ventas.filter((venta) => {
      if (!venta.fecha) return false;
      const fechaVenta = new Date(venta.fecha);
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    // Procesar los datos según el periodo solicitado
    let resultado = [];

    switch (periodo) {
      case "anual": {
        // Agrupar por año
        const ventasPorAnio = {};

        ventasFiltradas.forEach((venta) => {
          const anio = new Date(venta.fecha).getFullYear();
          if (!ventasPorAnio[anio]) {
            ventasPorAnio[anio] = 0;
          }
          ventasPorAnio[anio] += venta.monto || 0;
        });

        resultado = Object.keys(ventasPorAnio).map((anio) => ({
          name: anio,
          ventas: ventasPorAnio[anio],
        }));
        break;
      }

      case "mensual": {
        // Agrupar por mes
        const meses = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ];

        const ventasPorMes = new Array(12).fill(0);

        ventasFiltradas.forEach((venta) => {
          const mes = new Date(venta.fecha).getMonth();
          ventasPorMes[mes] += venta.monto || 0;
        });

        resultado = ventasPorMes.map((monto, index) => ({
          name: meses[index],
          ventas: monto,
          orden: index,
        }));
        break;
      }

      case "semanal": {
        // Agrupar por día de la semana
        const diasSemana = [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ];

        const ventasPorDia = new Array(7).fill(0);

        ventasFiltradas.forEach((venta) => {
          const dia = new Date(venta.fecha).getDay();
          ventasPorDia[dia] += venta.monto || 0;
        });

        resultado = ventasPorDia.map((monto, index) => ({
          name: diasSemana[index],
          ventas: monto,
          orden: index,
        }));
        break;
      }

      default:
        return res.status(400).json({ error: "Periodo no válido" });
    }

    res.json({
      success: true,
      data: resultado,
      periodo,
      anio,
    });
  } catch (error) {
    console.error("Error al generar reporte de ventas:", error);
    res.status(500).json({ error: "Error al generar el reporte de ventas" });
  }
});

//GET /api/ventas/reportes/estadisticas
router.get("/reportes/estadisticas", protect, async (req, res) => {
  try {
    const { anio = new Date().getFullYear(), mes, almacenId } = req.query;

    // Obtener todas las ventas (aplicar filtro de almacén si existe)
    const where = almacenId ? { almacen_id: almacenId } : {};
    const ventas = await Venta.findAll({
      where,
      attributes: ["id", "fecha", "monto"],
    });

    // Preparar filtros según los parámetros
    let fechaInicio, fechaFin;

    if (mes !== undefined) {
      // Si se especifica un mes
      const mesInt = parseInt(mes, 10);
      fechaInicio = new Date(anio, mesInt, 1);
      fechaFin = new Date(anio, mesInt + 1, 0, 23, 59, 59); // Último día del mes
    } else {
      // Solo filtrar por año
      fechaInicio = new Date(anio, 0, 1);
      fechaFin = new Date(anio, 11, 31, 23, 59, 59); // Fin de año
    }

    // Filtrar manualmente por fecha
    const ventasFiltradas = ventas.filter((venta) => {
      if (!venta.fecha) return false;
      const fechaVenta = new Date(venta.fecha);
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    // Calcular estadísticas
    const montos = ventasFiltradas.map((v) => v.monto || 0);
    const totalVentas = montos.reduce((sum, monto) => sum + monto, 0);

    const estadisticas = {
      totalVentas,
      ventaPromedio:
        ventasFiltradas.length > 0 ? totalVentas / ventasFiltradas.length : 0,
      ventaMaxima: ventasFiltradas.length > 0 ? Math.max(...montos) : 0,
      ventaMinima: ventasFiltradas.length > 0 ? Math.min(...montos) : 0,
      totalRegistros: ventasFiltradas.length,
    };

    res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de ventas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de ventas" });
  }
});

//GET /api/ventas/reportes/metodos-pago
router.get("/reportes/metodos-pago", protect, async (req, res) => {
  try {
    const { anio = new Date().getFullYear(), mes, almacenId } = req.query;

    // Obtener todas las ventas (aplicar filtro de almacén si existe)
    const where = almacenId ? { almacen_id: almacenId } : {};
    const ventas = await Venta.findAll({
      where,
      attributes: ["id", "fecha", "monto", "tipo_venta_id"],
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
    });

    // Preparar filtro de fecha basado en el año y posiblemente mes
    let fechaInicio, fechaFin;

    if (mes !== undefined) {
      // Si se especifica un mes
      const mesInt = parseInt(mes, 10);
      fechaInicio = new Date(anio, mesInt, 1);
      fechaFin = new Date(anio, mesInt + 1, 0, 23, 59, 59); // Último día del mes
    } else {
      // Solo filtrar por año
      fechaInicio = new Date(anio, 0, 1);
      fechaFin = new Date(anio, 11, 31, 23, 59, 59); // Fin de año
    }

    // Filtrar manualmente por fecha
    const ventasFiltradas = ventas.filter((venta) => {
      if (!venta.fecha) return false;
      const fechaVenta = new Date(venta.fecha);
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    // Agrupar por método de pago
    const distribucion = {};

    ventasFiltradas.forEach((venta) => {
      // Verificar que la venta tenga un tipo de venta asociado
      if (!venta.tipoVenta || !venta.tipoVenta.nombre) return;

      const nombreTipoVenta = venta.tipoVenta.nombre;

      if (!distribucion[nombreTipoVenta]) {
        distribucion[nombreTipoVenta] = {
          count: 0,
          total: 0,
        };
      }

      distribucion[nombreTipoVenta].count += 1;
      distribucion[nombreTipoVenta].total += venta.monto || 0;
    });

    // Formatear resultado
    const resultado = Object.keys(distribucion).map((metodo) => ({
      name: metodo,
      count: distribucion[metodo].count,
      total: distribucion[metodo].total,
    }));

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error("Error al obtener distribución por método de pago:", error);
    res
      .status(500)
      .json({ error: "Error al obtener distribución por método de pago" });
  }
});

// Ruta para generar y descargar un reporte en formato Excel
router.get("/reporte/:almacenId", protect, async (req, res) => {
  console.log(
    "Endpoint de reporte ejecutándose con almacenId:",
    req.params.almacenId
  );
  try {
    const { almacenId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    console.log("Parámetros recibidos:", { almacenId, fechaInicio, fechaFin });

    if (!almacenId) {
      return res.status(400).json({ message: "ID de almacén requerido" });
    }

    // Verificar permisos (opcional, si necesitas verificar permisos)
    const rolesPermitidos = ["administrador", "empleado"];
    const tienePermiso = checkUserPermissionForWarehouse(
      req.user,
      rolesPermitidos,
      almacenId
    );

    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado a este almacén.",
      });
    }

    // Construir condiciones para la consulta
    const where = { almacen_id: almacenId };

    // Obtener los datos de ventas
    const ventas = await Venta.findAll({
      where: where,
      include: [
        {
          model: TipoVenta,
          as: "tipoVenta",
          attributes: ["id", "nombre", "comision"],
        },
      ],
      order: [["fecha", "DESC"]],
    });

    // Filtrar manualmente por fecha (si se proporcionan)
    let ventasFiltradas = ventas;

    if (fechaInicio || fechaFin) {

      ventasFiltradas = ventas.filter((venta) => {
        if (!venta.fecha) return false;
        const fechaVenta = new Date(venta.fecha);

        //depuración
        const esIncluida = (() => {
          if (fechaInicio && fechaFin) {
            return fechaVenta >= new Date(fechaInicio) && fechaVenta <= new Date(fechaFin);
          }  else if (fechaInicio) {
              return fechaVenta >= new Date(fechaInicio);
          }  else if (fechaFin) {
              return fechaVenta <= new Date(fechaFin);
          }
          return true;
        })();

        if (esIncluida) {
          console.log(`Venta ID ${venta.id} (${venta.fecha}) incluida en el filtro`);
        }

        return esIncluida;
      });
    }

    if (!ventasFiltradas || ventasFiltradas.length === 0) {
      return res.status(404).json({
        message:
          "No se encontraron ventas para el período y almacén seleccionados",
      });
    }

    // Crear un nuevo libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Gestión";
    workbook.created = new Date();

    // Añadir una hoja para el reporte
    const worksheet = workbook.addWorksheet("Reporte de Ventas", {
      properties: { tabColor: { argb: "FFC0000" } },
    });

    // Añadir información del filtro en la primera fila
    if (fechaInicio || fechaFin) {
      const periodoRow = worksheet.addRow(["Período:"]);
      periodoRow.font = { bold: true };

      if (fechaInicio && fechaFin) {
        worksheet.addRow([`Del ${new Date(fechaInicio).toLocaleDateString()} al ${new Date(fechaFin).toLocaleDateString()}`]);
      } else if (fechaInicio) {
        worksheet.addRow([`Desde ${new Date(fechaInicio).toLocaleDateString()}`]);
      } else if (fechaFin) {
        worksheet.addRow([`Hasta ${new Date(fechaFin).toLocaleDateString()}`]);
      }

      // Añadir fila vacía como separador
      worksheet.addRow([]);
    }  

    // Definir las columnas
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Tipo de Venta", key: "tipoVenta", width: 20 },
      { header: "Monto Bruto", key: "montoBruto", width: 15 },
      { header: "Monto Neto", key: "montoNeto", width: 15 },
      { header: "Detalles", key: "detalles", width: 30 },
    ];

    // Dar formato a los encabezados
    worksheet.getRow(worksheet.lastRow?.number + 1 || 1).font = { bold: true };
    worksheet.getRow(worksheet.lastRow?.number).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Añadir los datos a la hoja
    let totalMontoBruto = 0;
    let totalMontoNeto = 0;
    ventasFiltradas.forEach((venta) => {
      const montoBruto = parseFloat(venta.monto_bruto) || 0;
      const montoNeto = parseFloat(venta.monto_neto) || 0;
      totalMontoBruto += montoBruto;
      totalMontoNeto += montoNeto;

      worksheet.addRow({
        id: venta.id,
        fecha: venta.fecha ? new Date(venta.fecha).toLocaleDateString() : "",
        tipoVenta: venta.tipoVenta ? venta.tipoVenta.nombre : "",
        montoBruto: montoBruto,
        montoNeto: montoNeto,
        detalles: venta.detalles || "",
      });
    });

    // Formatear columna de monto como moneda
    worksheet.getColumn("montoBruto").numFmt = '"$"#,##0';
    worksheet.getColumn("montoNeto").numFmt = '"$"#,##0';

    // Añadir totales al final
    worksheet.addRow([]);
    const totalRow = worksheet.rowCount + 1;
    worksheet.addRow(["", "", "TOTALES:", totalMontoBruto, totalMontoNeto, ""]);

    const filaTotal = worksheet.getRow(totalRow);
    filaTotal.font = { bold: true };
    filaTotal.getCell(4).numFmt = '"$"#,##0'; // Formato para monto bruto
    filaTotal.getCell(5).numFmt = '"$"#,##0'; // Formato para monto neto

    // Añadir pie de página con información adicional
    worksheet.addRow([]);
    worksheet.addRow(["Reporte generado:", new Date().toLocaleString('es-CL')]);
    if (req.user && req.user.nombre) {
      worksheet.addRow(["Usuario:", `${req.user.nombre} ${req.user.apellido || ''}`]);
    }

    // Nombre del archivo que incluya información del filtro
    let nombreFiltro = "";
    if (fechaInicio && fechaFin) {
      nombreFiltro = `-${fechaInicio}-a-${fechaFin}`;
    } else if (fechaInicio) {
      nombreFiltro = `-desde-${fechaInicio}`;
    } else if (fechaFin) {
      nombreFiltro = `-hasta-${fechaFin}`;
    }

    const fileName = `reporte-ventas-${almacenId}${nombreFiltro}-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Configurar cabeceras para la descarga
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Escribir el libro de Excel a la respuesta
    await workbook.xlsx.write(res);

    // Finalizar la respuesta
    res.end();
  } catch (error) {
    console.error("Error al generar reporte de ventas en Excel:", error);
    res.status(500).json({
      message: "Error al generar reporte de ventas",
      error: error.message,
    });
  }
});

module.exports = router;
