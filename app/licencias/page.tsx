"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type CalendarCell = {
  empty: boolean;
  day?: number;
  className?: string;
  tooltip?: string;
  turno?: string;
};

type CalendarMonth = {
  title: string;
  cells: CalendarCell[];
};

type Result =
  | {
      type: "licencia";
      error: string;
      ultimo: string;
      totalDiasCorridos: number;
      diasGuardia: number;
      diasHabiles: number;
      filas: Array<{ fecha: string; dia: string; turno: string; motivo: string; tipo: string; clase: string }>;
      calendarios: CalendarMonth[];
      tituloResultado: string;
      nombreArchivo: string;
    }
  | {
      type: "anual";
      error: string;
      anio: number;
      feriadosAnuales: Array<{ fecha: string; dia: string; motivo: string }>;
      calendarios: CalendarMonth[];
      tituloResultado: string;
      nombreArchivo: string;
    };

const MESES_ES = [
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

const DIAS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TURNOS = ["A", "B", "C", "D"];
const BASE_TURNO = makeDate(2026, 3, 10);

const EXCEPCIONES_OFICIALES: Record<number, Record<string, string>> = {
  2026: {
    "2026-03-23": "Día no laborable con fines turísticos",
    "2026-07-10": "Día no laborable con fines turísticos",
    "2026-12-07": "Día no laborable con fines turísticos",
  },
};

const TRASLADOS_SABADO_DOMINGO_OFICIALES: Record<string, string> = {};
const cacheNoHabiles: Record<number, Record<string, string>> = {};

declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}

function cloneDate(date: Date) {
  return makeDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = cloneDate(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(a: Date, b: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((dateOnlyMs(a) - dateOnlyMs(b)) / oneDay);
}

function dateOnlyMs(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function weekdayMondayFirst(date: Date) {
  return (date.getDay() + 6) % 7;
}

function parseInputDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return cloneDate(new Date());
  return makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function formatInputDate(date: Date) {
  return dateKey(date);
}

function formatDate(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function agregarNoHabil(dict: Record<string, string>, fecha: Date, nombre: string) {
  const key = dateKey(fecha);
  if (dict[key]) {
    if (!dict[key].includes(nombre)) dict[key] = `${dict[key]} / ${nombre}`;
  } else {
    dict[key] = nombre;
  }
}

function calcularPascua(anio: number) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return makeDate(anio, mes, dia);
}

function trasladarFeriado(fechaOriginal: Date) {
  const override = TRASLADOS_SABADO_DOMINGO_OFICIALES[dateKey(fechaOriginal)];
  if (override) return parseInputDate(override);

  const diaSemana = weekdayMondayFirst(fechaOriginal);
  if (diaSemana === 0) return fechaOriginal;
  if (diaSemana === 1 || diaSemana === 2) return addDays(fechaOriginal, -diaSemana);
  if (diaSemana === 3 || diaSemana === 4) return addDays(fechaOriginal, 7 - diaSemana);
  return fechaOriginal;
}

function feriadosTrasladablesBase(anio: number) {
  return [
    [makeDate(anio, 6, 17), "Paso a la Inmortalidad del General Don Martín Miguel de Güemes"],
    [makeDate(anio, 8, 17), "Paso a la Inmortalidad del General Don José de San Martín"],
    [makeDate(anio, 10, 12), "Día del Respeto a la Diversidad Cultural"],
    [makeDate(anio, 11, 20), "Día de la Soberanía Nacional"],
  ] as const;
}

function noHabilesArgentina(anio: number) {
  if (cacheNoHabiles[anio]) return cacheNoHabiles[anio];

  const noHabiles: Record<string, string> = {};
  const inamovibles = [
    [makeDate(anio, 1, 1), "Año Nuevo"],
    [makeDate(anio, 3, 24), "Día Nacional de la Memoria por la Verdad y la Justicia"],
    [makeDate(anio, 4, 2), "Día del Veterano y de los Caídos en la Guerra de Malvinas"],
    [makeDate(anio, 5, 1), "Día del Trabajador"],
    [makeDate(anio, 5, 25), "Día de la Revolución de Mayo"],
    [makeDate(anio, 6, 20), "Paso a la Inmortalidad del General Manuel Belgrano"],
    [makeDate(anio, 7, 9), "Día de la Independencia"],
    [makeDate(anio, 12, 8), "Día de la Inmaculada Concepción de María"],
    [makeDate(anio, 12, 25), "Navidad"],
  ] as const;

  for (const [fecha, nombre] of inamovibles) agregarNoHabil(noHabiles, fecha, nombre);

  const pascua = calcularPascua(anio);
  agregarNoHabil(noHabiles, addDays(pascua, -48), "Carnaval");
  agregarNoHabil(noHabiles, addDays(pascua, -47), "Carnaval");
  agregarNoHabil(noHabiles, addDays(pascua, -3), "Jueves Santo");
  agregarNoHabil(noHabiles, addDays(pascua, -2), "Viernes Santo");

  for (const [fechaOriginal, nombre] of feriadosTrasladablesBase(anio)) {
    const fechaObservada = trasladarFeriado(fechaOriginal);
    if (dateKey(fechaObservada) === dateKey(fechaOriginal)) {
      agregarNoHabil(noHabiles, fechaObservada, nombre);
    } else {
      agregarNoHabil(noHabiles, fechaObservada, `${nombre} - trasladado desde ${formatDate(fechaOriginal)}`);
    }
  }

  for (const [key, nombre] of Object.entries(EXCEPCIONES_OFICIALES[anio] || {})) {
    agregarNoHabil(noHabiles, parseInputDate(key), nombre);
  }

  cacheNoHabiles[anio] = noHabiles;
  return noHabiles;
}

function obtenerNoHabil(fecha: Date) {
  return noHabilesArgentina(fecha.getFullYear())[dateKey(fecha)] || "";
}

function esDiaComputable(fecha: Date, fechaInicio: Date) {
  if (obtenerNoHabil(fecha)) return false;
  if (dateKey(fecha) === dateKey(fechaInicio)) return true;
  return weekdayMondayFirst(fecha) < 5;
}

function obtenerTurno(fecha: Date) {
  const diff = daysBetween(fecha, BASE_TURNO);
  if (diff < 0) return "";
  return TURNOS[diff % 4];
}

function calcularPlazo(fechaInicio: Date, diasHabiles: number) {
  if (obtenerNoHabil(fechaInicio)) return [];

  let fecha = cloneDate(fechaInicio);
  const dias: Date[] = [];

  while (dias.length < diasHabiles) {
    if (esDiaComputable(fecha, fechaInicio)) dias.push(cloneDate(fecha));
    fecha = addDays(fecha, 1);
  }

  return dias;
}

function generarMeses(fechaInicio: Date, fechaFin: Date) {
  const meses: Array<{ year: number; month: number }> = [];
  let year = fechaInicio.getFullYear();
  let month = fechaInicio.getMonth() + 1;

  while (year < fechaFin.getFullYear() || (year === fechaFin.getFullYear() && month <= fechaFin.getMonth() + 1)) {
    meses.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return meses;
}

function construirCeldasMes({
  year,
  month,
  fechaInicio,
  ultimo,
  diasHabilesSet = new Set<string>(),
  turno = "A",
  modo = "licencia",
}: {
  year: number;
  month: number;
  fechaInicio?: Date;
  ultimo?: Date;
  diasHabilesSet?: Set<string>;
  turno?: string;
  modo?: "licencia" | "anual";
}) {
  const cells: CalendarCell[] = [];
  const first = makeDate(year, month, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const leadingBlanks = weekdayMondayFirst(first);

  for (let i = 0; i < leadingBlanks; i += 1) cells.push({ empty: true });

  for (let dia = 1; dia <= lastDay; dia += 1) {
    const fecha = makeDate(year, month, dia);
    const noHabil = obtenerNoHabil(fecha);
    const turnoFecha = obtenerTurno(fecha);
    let clase = "normal";

    if (modo === "anual") {
      if (noHabil) clase = "feriado";
      else if (weekdayMondayFirst(fecha) >= 5) clase = "finde";
      else clase = "normal";
    } else if (fechaInicio && ultimo) {
      const enPeriodo = dateOnlyMs(fecha) >= dateOnlyMs(fechaInicio) && dateOnlyMs(fecha) <= dateOnlyMs(ultimo);
      if (!enPeriodo) clase = "fuera";
      else if (noHabil) clase = "feriado";
      else if (dateKey(fecha) === dateKey(fechaInicio)) clase = "inicio";
      else if (dateKey(fecha) === dateKey(ultimo)) clase = "fin";
      else if (weekdayMondayFirst(fecha) >= 5) clase = "finde";
      else if (diasHabilesSet.has(dateKey(fecha))) clase = "licencia";
      else clase = "fuera";
    }

    const fechaStr = formatDate(fecha);
    let tooltip = `${fechaStr} - Día hábil | Turno ${turnoFecha}`;
    if (noHabil) tooltip = `${fechaStr} - Feriado / no laborable: ${noHabil}`;
    else if (modo === "licencia" && fechaInicio && dateKey(fecha) === dateKey(fechaInicio) && weekdayMondayFirst(fecha) >= 5) tooltip = `${fechaStr} - Inicio computado | Turno ${turnoFecha}`;
    else if (weekdayMondayFirst(fecha) >= 5) tooltip = `${fechaStr} - Fin de semana`;

    cells.push({
      empty: false,
      day: dia,
      className: clase,
      tooltip,
      turno: turnoFecha === turno ? turnoFecha : "",
    });
  }

  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}

function construirResultadoLicencia(fechaInicio: Date, diasHabiles: number, turno: string): Result {
  const noHabilInicio = obtenerNoHabil(fechaInicio);
  if (noHabilInicio) {
    return {
      type: "licencia",
      error: `La fecha de inicio seleccionada es feriado / no laborable: ${noHabilInicio}.`,
      ultimo: "",
      totalDiasCorridos: 0,
      diasGuardia: 0,
      diasHabiles: 0,
      filas: [],
      calendarios: [],
      tituloResultado: "",
      nombreArchivo: `calendario-licencia-${dateKey(fechaInicio)}`,
    };
  }

  const diasHabilesCalculados = calcularPlazo(fechaInicio, diasHabiles);
  const diasHabilesSet = new Set(diasHabilesCalculados.map(dateKey));
  const ultimo = diasHabilesCalculados[diasHabilesCalculados.length - 1];
  const totalDiasCorridos = daysBetween(ultimo, fechaInicio) + 1;

  let diasGuardia = 0;
  for (let fecha = cloneDate(fechaInicio); dateOnlyMs(fecha) <= dateOnlyMs(ultimo); fecha = addDays(fecha, 1)) {
    if (obtenerTurno(fecha) === turno) diasGuardia += 1;
  }

  const filas = [];
  for (let fecha = cloneDate(fechaInicio); dateOnlyMs(fecha) <= dateOnlyMs(ultimo); fecha = addDays(fecha, 1)) {
    const noHabil = obtenerNoHabil(fecha);
    const turnoFecha = obtenerTurno(fecha);
    let clase = "";
    let tipo = "No computado";

    if (noHabil) {
      clase = "feriado";
      tipo = "Feriado / no laborable";
    } else if (dateKey(fecha) === dateKey(fechaInicio) && weekdayMondayFirst(fecha) >= 5) {
      clase = "inicio";
      tipo = "Inicio computado";
    } else if (weekdayMondayFirst(fecha) >= 5) {
      clase = "finde";
      tipo = "Fin de semana";
    } else if (diasHabilesSet.has(dateKey(fecha))) {
      clase = "licencia";
      tipo = "Día computado";
    }

    filas.push({
      fecha: formatDate(fecha),
      dia: DIAS_ES[weekdayMondayFirst(fecha)],
      turno: turnoFecha,
      motivo: noHabil,
      tipo,
      clase,
    });
  }

  const calendarios = generarMeses(fechaInicio, ultimo).map(({ year, month }) => ({
    title: `${MESES_ES[month - 1]} ${year}`,
    cells: construirCeldasMes({ year, month, fechaInicio, ultimo, diasHabilesSet, turno, modo: "licencia" }),
  }));

  return {
    type: "licencia",
    error: "",
    ultimo: formatDate(ultimo),
    totalDiasCorridos,
    diasGuardia,
    diasHabiles: diasHabilesCalculados.length,
    filas,
    calendarios,
    tituloResultado: "Calendario de licencia",
    nombreArchivo: `calendario-licencia-${dateKey(fechaInicio)}`,
  };
}

function construirResultadoAnual(anio: number, turno: string): Result {
  const calendarios = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      title: `${MESES_ES[i]} ${anio}`,
      cells: construirCeldasMes({ year: anio, month, turno, modo: "anual" }),
    };
  });

  const feriadosAnuales = Object.entries(noHabilesArgentina(anio))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, motivo]) => {
      const fecha = parseInputDate(key);
      return {
        fecha: formatDate(fecha),
        dia: DIAS_ES[weekdayMondayFirst(fecha)],
        motivo,
      };
    });

  return {
    type: "anual",
    error: "",
    anio,
    feriadosAnuales,
    calendarios,
    tituloResultado: `Calendario anual ${anio}`,
    nombreArchivo: `calendario-anual-${anio}`,
  };
}

function loadHtml2Canvas() {
  return new Promise<void>((resolve, reject) => {
    if (window.html2canvas) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-html2canvas="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.async = true;
    script.dataset.html2canvas = "true";
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function LicenciasPage() {
  const today = useMemo(() => formatInputDate(new Date()), []);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [diasHabiles, setDiasHabiles] = useState(10);
  const [turno, setTurno] = useState("A");
  const [result, setResult] = useState<Result | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  function calcularLicencia() {
    setResult(construirResultadoLicencia(parseInputDate(fechaInicio), Math.max(1, Number(diasHabiles) || 1), turno));
  }

  function verAnual() {
    setResult(construirResultadoAnual(parseInputDate(fechaInicio).getFullYear(), turno));
  }

  async function descargarJpg() {
    if (!captureRef.current) return;

    try {
      setDownloadError(false);
      setGenerating(true);
      await loadHtml2Canvas();
      if (!window.html2canvas) throw new Error("html2canvas no disponible");

      const element = captureRef.current;
      const canvas = await window.html2canvas(element, {
        backgroundColor: "#0b1620",
        scale: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = `${result?.nombreArchivo || "calendario"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      setDownloadError(true);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="app license-page">
      <div className="topbar">
        <Link href="/" className="back-link">← Inicio</Link>
        <span>Suite Operativa</span>
      </div>

      <header className="header app-hero compact">
        <span className="eyebrow">Planificador</span>
        <h1>Licencias</h1>
        <p className="sub">Calculá días computados, feriados, fines de semana y turnos con el mismo criterio visual de toda la suite.</p>
      </header>

      <section className="card panel-strong">
        <div className="license-form">
          <label>
            Fecha de inicio / año
            <input type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />
          </label>

          <label>
            Días
            <input type="number" min={1} value={diasHabiles} onChange={(event) => setDiasHabiles(Number(event.target.value))} />
          </label>

          <label>
            Turno
            <select value={turno} onChange={(event) => setTurno(event.target.value)}>
              {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <div className="button-group">
            <button type="button" onClick={calcularLicencia}>Calcular licencia</button>
            <button type="button" className="secondary" onClick={verAnual}>Ver calendario anual</button>
          </div>
        </div>
      </section>

      {result?.error && <div className="error-box">{result.error}</div>}

      {result && !result.error && (
        <section className="results-area">
          <div className="results-heading">
            <div>
              <span className="eyebrow">Resultado</span>
              <h2>{result.tituloResultado}</h2>
            </div>
            <button type="button" className="success" onClick={descargarJpg} disabled={generating}>
              {generating ? "Generando JPG..." : "Descargar calendario en JPG"}
            </button>
          </div>

          {downloadError && (
            <div className="error-box">No se pudo generar el JPG. Verificá la conexión y probá nuevamente.</div>
          )}

          {result.type === "licencia" && (
            <>
              <section className="metrics">
                <div className="metric"><span>Último día</span><strong>{result.ultimo}</strong></div>
                <div className="metric"><span>Días computados</span><strong>{result.diasHabiles}</strong></div>
                <div className="metric"><span>Días corridos</span><strong>{result.totalDiasCorridos}</strong></div>
                <div className="metric"><span>Días de guardia</span><strong>{result.diasGuardia}</strong></div>
              </section>

              <details className="card details-card">
                <summary>Ver detalle de días</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Día</th>
                        <th>Turno</th>
                        <th>Tipo</th>
                        <th>Feriado / nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.filas.map((fila) => (
                        <tr key={fila.fecha} className={fila.clase}>
                          <td>{fila.fecha}</td>
                          <td>{fila.dia}</td>
                          <td>{fila.turno}</td>
                          <td>{fila.tipo}</td>
                          <td>{fila.motivo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          {result.type === "anual" && (
            <details className="card details-card">
              <summary>Ver feriados del año</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Día</th>
                      <th>Feriado / no laborable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.feriadosAnuales.map((feriado) => (
                      <tr key={feriado.fecha} className="feriado">
                        <td>{feriado.fecha}</td>
                        <td>{feriado.dia}</td>
                        <td>{feriado.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <div className="legend">
            {result.type === "licencia" ? (
              <>
                <span><i className="dot dot-blue" />Inicio</span>
                <span><i className="dot dot-purple" />Fin</span>
                <span><i className="dot dot-green" />Día computado</span>
              </>
            ) : (
              <span><i className="dot dot-normal" />Día hábil</span>
            )}
            <span><i className="dot dot-yellow" />Fin de semana</span>
            <span><i className="dot dot-red" />Feriado / no laborable</span>
          </div>

          <div className="calendar-scroll">
            <div ref={captureRef} className="calendar-download-zone">
              <section className={`calendar-container ${result.type === "anual" ? "anual" : "licencia"}`}>
                {result.calendarios.map((calendario) => (
                  <div className="calendar" key={calendario.title}>
                    <div className="month-title">{calendario.title}</div>
                    <div className="calendar-grid">
                      {["L", "M", "X", "J", "V", "S", "D"].map((d) => <div className="day-name" key={d}>{d}</div>)}
                      {calendario.cells.map((cell, index) => (
                        cell.empty ? (
                          <div className="day fuera" key={`${calendario.title}-${index}`} />
                        ) : (
                          <div className={`day ${cell.className}`} title={cell.tooltip} key={`${calendario.title}-${cell.day}-${index}`}>
                            {cell.day}
                            {cell.turno && <div className="turno">{cell.turno}</div>}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
