export type Herramienta = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  stats: string[];
  status: "Disponible" | "En mejora" | "Próximamente";
};

export const herramientas: Herramienta[] = [
  {
    href: "/recargos",
    eyebrow: "Turno B",
    title: "Recargos y Francos",
    description:
      "Carga diaria, historial mensual, comparativo por persona y exportación de reportes JPG para seguimiento operativo.",
    stats: ["Carga diaria", "Historial", "Respaldos"],
    status: "Disponible",
  },
  {
    href: "/licencias",
    eyebrow: "Calendario",
    title: "Planificador de Licencias",
    description:
      "Cálculo de días computados, feriados, fines de semana, turnos y calendario anual para organizar licencias.",
    stats: ["Licencias", "Feriados", "Turnos"],
    status: "Disponible",
  },
];

export const suiteInfo = {
  eyebrow: "Suite SPB",
  title: "Herramientas para facilitar nuestro trabajo en el SPB",
  description:
    "Un panel único para reunir herramientas internas del Servicio Penitenciario Bonaerense, ordenar tareas frecuentes y acceder rápido a soluciones que simplifican la gestión diaria.",
  maintenanceTitle: "Preparado para crecer",
  maintenanceDescription:
    "Cada herramienta vive en su propia ruta y la página principal se alimenta desde este archivo central. Para sumar una nueva, solo se crea una carpeta en app/ y se agrega una tarjeta en esta lista.",
};
