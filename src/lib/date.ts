import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";

/**
 * Devuelve un array con todos los días que se van a mostrar en el calendario.
 * Incluye algunos días del mes anterior y del siguiente
 * para completar las filas (como cualquier calendario).
 */
export function monthGridDays(active: Date) {
  const start = startOfWeek(startOfMonth(active), { weekStartsOn: 1 }); // lunes
  const end = endOfWeek(endOfMonth(active), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }); // lista de fechas completas
}

/** Formatea el mes actual en texto legible, por ejemplo: “octubre 2025” */
export function fmtMonthYear(d: Date) {
  return format(d, "LLLL yyyy"); 
}

// Reexportamos funciones útiles
export { isSameMonth, isToday };
