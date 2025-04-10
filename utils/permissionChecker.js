/**
 * Verifica si un usuario tiene un rol requerido dentro de un almacén específico.
 * Otorga acceso automático si el usuario es Administrador del Sistema.
 *
 * @param {object} user - El objeto req.user poblado por el middleware 'protect'. Debe contener 'esAdminSistema' y 'almacenes'.
 * @param {string[]} requiredRoles - Un array con los nombres de los roles permitidos para la acción (ej: ['administrador', 'empleado']). Si es un array vacío [], significa que cualquier rol en ese almacén es suficiente.
 * @param {string|number} targetAlmacenId - El ID del almacén para el cual se requiere el permiso.
 * @returns {boolean} - true si está autorizado, false si no.
 */
const checkUserPermissionForWarehouse = (
  user,
  requiredRoles = [],
  targetAlmacenId
) => {
  console.log(user, requiredRoles, targetAlmacenId);
  if (!user || !targetAlmacenId) {
    console.error(
      "Error en checkPermission: Falta el objeto user o targetAlmacenId."
    );
    return false;
  }

  if (user.esAdminSistema === true) {
    console.log(
      `Permiso concedido para Almacen ${targetAlmacenId} (Admin Sistema).`
    );
    return true;
  }

  if (!Array.isArray(user.almacenes)) {
    console.error(
      "Error en checkPermission: req.user.almacenes no es un array."
    );
    return false;
  }

  const targetIdStr = String(targetAlmacenId);
  const permission = user.almacenes.find((a) => String(a.id) === targetIdStr);

  if (!permission) {
    console.log(
      `Permiso denegado: Usuario ${user.id} no tiene acceso al Almacen ${targetAlmacenId}.`
    );
    return false; // El usuario no tiene relación con ese almacén
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(permission.rol)) {
    console.log(
      `Permiso denegado: Rol '${permission.rol}' del Usuario ${
        user.id
      } en Almacen ${targetAlmacenId} no cumple con [${requiredRoles.join(
        ", "
      )}].`
    );
    return false; // El rol del usuario no está en la lista de roles requeridos
  }

  console.log(
    `Permiso concedido: Usuario ${user.id} tiene rol '${
      permission.rol
    }' en Almacen ${targetAlmacenId}. Requerido: [${requiredRoles.join(", ")}].`
  );
  return true;
};

module.exports = { checkUserPermissionForWarehouse };
