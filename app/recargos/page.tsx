"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Recargo = { persona: string; horario: string; detalle: string };
type FrancoPosterior = { persona: string; detalle: string };
type Novedad = { persona: string; detalle: string };
type Guardia = {
  fecha: string;
  fechaKey: string;
  oficial: string;
  creado: string;
  recargos: Recargo[];
  francos: string[];
  francosPost: FrancoPosterior[];
  novedades: Novedad[];
  observaciones: string;
};

type MonthlyStat = {
  guardias: number;
  manana: number;
  tarde: number;
  noche: number;
  total: number;
  francos: number;
  novedades: number;
  detalle: string[];
};

const DEFAULT_PERSONAL = [
  "Adjutor (e.g) Magali Cepeda",
  "Adjutor (e.g) Lautaro Cardona",
  "Adjutor (e.g) Sabrina Coria",
  "Sgto 1ero (e.g) Fernanda Reula",
  "Subof mayor (e.g) Germán Pérez",
  "Subof mayor (e.g) Gastón Guglielmati",
];

const OFICIALES = [
  "Subalcaide (e.g) Nicolas Girimonti",
  "Adjutor (e.g) Oriana Carranza",
];

const emptyRecargo = (): Recargo => ({ persona: "", horario: "", detalle: "" });
const emptyPost = (): FrancoPosterior => ({ persona: "", detalle: "" });
const emptyNov = (): Novedad => ({ persona: "", detalle: "" });

function todayAR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fechaKey(fecha: string) {
  const m = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return fecha.trim();
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseFecha(fecha: string) {
  const m = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  return { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) };
}

function stripRank(name: string) {
  const idx = name.indexOf(")");
  return idx >= 0 ? name.slice(idx + 1).trim() : name;
}

function turnoRecargo(horario: string): "manana" | "tarde" | "noche" {
  const m = horario.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return "noche";
  const h = Number(m[1]);
  const min = Number(m[2]);
  const val = h + min / 60;
  if (val >= 7 && val < 13) return "manana";
  if (val >= 13 && val < 20) return "tarde";
  return "noche";
}

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function wrapCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = `${line} ${word}`.trim();
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, type: string) {
  const navy = "#0b2d42";
  const green = "#2e7d6a";
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e3f4ee";
  ctx.beginPath();
  ctx.arc(cx, cy, 31, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = navy;
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 3;

  if (type === "calendar") {
    ctx.strokeRect(cx - 20, cy - 14, 40, 34);
    ctx.fillStyle = navy;
    ctx.fillRect(cx - 20, cy - 14, 40, 10);
    ctx.fillStyle = "#aeb8bf";
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(cx - 13 + i * 10, cy + j * 9, 5, 5);
    ctx.strokeStyle = green;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 10);
    ctx.lineTo(cx - 3, cy + 15);
    ctx.lineTo(cx + 9, cy + 2);
    ctx.stroke();
  }

  if (type === "franco") {
    ctx.strokeStyle = navy;
    ctx.strokeRect(cx - 6, cy - 25, 28, 50);
    ctx.strokeStyle = green;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 21);
    ctx.lineTo(cx + 16, cy - 21);
    ctx.lineTo(cx + 10, cy - 27);
    ctx.moveTo(cx + 16, cy - 21);
    ctx.lineTo(cx + 10, cy - 15);
    ctx.stroke();

    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = green;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 8);
    ctx.lineTo(cx - 13, cy + 4);
    ctx.lineTo(cx - 25, cy + 21);
    ctx.moveTo(cx - 13, cy + 4);
    ctx.lineTo(cx - 2, cy + 20);
    ctx.moveTo(cx - 17, cy - 2);
    ctx.lineTo(cx - 4, cy - 8);
    ctx.stroke();
  }

  if (type === "plus") {
    ctx.strokeRect(cx - 18, cy - 14, 36, 34);
    ctx.fillStyle = navy;
    ctx.fillRect(cx - 18, cy - 14, 36, 10);
    ctx.strokeStyle = green;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx, cy + 13);
    ctx.moveTo(cx - 8, cy + 6);
    ctx.lineTo(cx + 8, cy + 6);
    ctx.stroke();
  }

  if (type === "shield") {
    ctx.fillStyle = green;
    ctx.strokeStyle = navy;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx + 20, cy - 14);
    ctx.lineTo(cx + 15, cy + 17);
    ctx.lineTo(cx, cy + 28);
    ctx.lineTo(cx - 15, cy + 17);
    ctx.lineTo(cx - 20, cy - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 2, cy + 4, 4, 14);
  }

  if (type === "note") {
    ctx.strokeStyle = navy;
    ctx.strokeRect(cx - 18, cy - 22, 36, 44);
    ctx.fillStyle = navy;
    ctx.fillRect(cx - 8, cy - 27, 16, 8);
    ctx.strokeStyle = green;
    ctx.lineWidth = 2;
    for (const yy of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.arc(cx - 12, cy + yy, 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + yy);
      ctx.lineTo(cx + 12, cy + yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string, type = "image/jpeg") {
  const a = document.createElement("a");
  a.href = canvas.toDataURL(type, 0.98);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function Page() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<"carga" | "historial" | "personal" | "respaldo">("carga");

  const [personal, setPersonal] = useState<string[]>(DEFAULT_PERSONAL);
  const [history, setHistory] = useState<Guardia[]>([]);
  const [fecha, setFecha] = useState(todayAR());
  const [oficial, setOficial] = useState(OFICIALES[0]);
  const [recargos, setRecargos] = useState<Recargo[]>(Array.from({ length: 8 }, emptyRecargo));
  const [francos, setFrancos] = useState<string[]>([]);
  const [francosPost, setFrancosPost] = useState<FrancoPosterior[]>(Array.from({ length: 8 }, emptyPost));
  const [novedades, setNovedades] = useState<Novedad[]>(Array.from({ length: 7 }, emptyNov));
  const [observaciones, setObservaciones] = useState("Sin novedad.");
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    setPersonal(loadLS("ctb_personal", DEFAULT_PERSONAL));
    setHistory(loadLS("ctb_historial", []));
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLS("ctb_personal", personal);
  }, [personal, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLS("ctb_historial", history);
  }, [history, hydrated]);

  const currentGuardia: Guardia = {
    fecha,
    fechaKey: fechaKey(fecha),
    oficial,
    creado: new Date().toISOString(),
    recargos: recargos.filter((r) => r.persona),
    francos,
    francosPost: francosPost.filter((f) => f.persona),
    novedades: novedades.filter((n) => n.persona || n.detalle),
    observaciones,
  };

  function updateRecargo(index: number, patch: Partial<Recargo>) {
    setRecargos((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updatePost(index: number, patch: Partial<FrancoPosterior>) {
    setFrancosPost((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateNovedad(index: number, patch: Partial<Novedad>) {
    setNovedades((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function saveGuardiaToHistory(guardia: Guardia) {
    setHistory((prev) => {
      const map = new Map<string, Guardia>();
      for (const item of prev) map.set(item.fechaKey || fechaKey(item.fecha), item);
      map.set(guardia.fechaKey, guardia);
      return Array.from(map.values()).sort((a, b) => (a.fechaKey > b.fechaKey ? 1 : -1));
    });
  }

  function monthlyStats(m: number, y: number) {
    const stats: Record<string, MonthlyStat> = {};
    for (const p of personal) {
      stats[p] = { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
    }
    const guardiasSet: Record<string, Set<string>> = {};
    for (const p of personal) guardiasSet[p] = new Set();

    for (const g of history) {
      const parsed = parseFecha(g.fecha);
      if (!parsed || parsed.m !== m || parsed.y !== y) continue;
      const touched = new Set<string>();

      for (const r of g.recargos || []) {
        if (!stats[r.persona]) stats[r.persona] = { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
        const t = turnoRecargo(r.horario);
        stats[r.persona][t]++;
        stats[r.persona].total++;
        stats[r.persona].detalle.push(`${g.fecha} | ${r.horario || "-"} | ${r.detalle || "-"} | ${t === "manana" ? "MAÑANA" : t.toUpperCase()}`);
        touched.add(r.persona);
      }

      for (const p of g.francos || []) {
        if (!stats[p]) stats[p] = { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
        stats[p].francos++;
        touched.add(p);
      }

      for (const n of g.novedades || []) {
        if (!n.persona) continue;
        if (!stats[n.persona]) stats[n.persona] = { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
        stats[n.persona].novedades++;
        touched.add(n.persona);
      }

      Array.from(touched).forEach((p) => {
        if (!guardiasSet[p]) guardiasSet[p] = new Set();
        guardiasSet[p].add(g.fechaKey);
      });
    }

    for (const p of Object.keys(stats)) stats[p].guardias = guardiasSet[p]?.size || 0;
    return stats;
  }

  const stats = useMemo(() => monthlyStats(month, year), [history, personal, month, year]);
  const selectedStats = selectedPerson ? stats[selectedPerson] : null;

  function generateReportCanvas(guardia: Guardia) {
    const scale = 2;
    const W = 1120;
    const secH = (rows: number, min = 160) => Math.max(min, 94 + Math.max(1, rows) * 60 + 36);
    const H =
      280 +
      secH(guardia.recargos.length, 170) +
      secH(guardia.francos.length, 150) +
      secH(guardia.francosPost.length, 160) +
      secH(guardia.novedades.length, 160) +
      210 +
      135 +
      28 * 5;

    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    const navy = "#0b2d42";
    const green = "#2e7d6a";
    const text = "#10212d";
    const line = "#d7e2e8";

    ctx.fillStyle = "#eef3f6";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = navy;
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 10, 10, W - 20, H - 20, 32, "transparent", navy);

    drawRoundedRect(ctx, 28, 24, W - 56, 246, 30, navy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 74px Arial";
    ctx.fillText("CENTINELAS", 70, 100);
    ctx.strokeStyle = green;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(70, 146);
    ctx.lineTo(W - 80, 146);
    ctx.stroke();
    ctx.fillStyle = "#d5f3e7";
    ctx.font = "bold 31px Arial";
    ctx.fillText("Turno B", 70, 188);
    ctx.fillStyle = "#fff";
    ctx.fillText("| Recargos y Francos", 215, 188);
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Guardia: ${guardia.fecha}`, W - 330, 154);
    ctx.font = "18px Arial";
    const offLines = wrapCanvas(ctx, `Oficial de Servicio: ${guardia.oficial}`, 300);
    offLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W - 330, 184 + i * 22));

    function section(
      y: number,
      title: string,
      icon: string,
      rows: unknown[],
      render: (x: number, y: number, row: any) => void,
      minHeight = 160
    ) {
      const x1 = 146;
      const x2 = W - 36;
      const h = secH(rows.length, minHeight);
      drawIcon(ctx, 82, y + 66, icon);
      drawRoundedRect(ctx, x1 + 4, y + 12, x2 - x1, h, 24, "#e0e6ea");
      drawRoundedRect(ctx, x1, y + 8, x2 - x1, h, 24, "#fff", line);
      const tw: Record<string, number> = {
        RECARGOS: 340,
        FRANCOS: 305,
        "FRANCOS POSTERIORES": 500,
        NOVEDADES: 335,
        OBSERVACIONES: 425,
      };
      drawRoundedRect(ctx, x1, y + 8, tw[title] || 340, 66, 20, navy);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 29px Arial";
      ctx.fillText(title, x1 + 34, y + 52);
      ctx.strokeStyle = green;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x1 + (tw[title] || 340) + 30, y + 42);
      ctx.lineTo(x2 - 30, y + 42);
      ctx.stroke();

      const base = y + 100;
      if (!rows.length) {
        ctx.fillStyle = "#66727c";
        ctx.font = "22px Arial";
        ctx.fillText("Sin datos cargados.", x1 + 42, base);
      } else {
        rows.forEach((row, idx) => {
          const cy = base + idx * 60;
          ctx.fillStyle = green;
          ctx.beginPath();
          ctx.arc(x1 + 40, cy - 7, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px Arial";
          ctx.textAlign = "center";
          ctx.fillText(String(idx + 1), x1 + 40, cy);
          ctx.textAlign = "left";
          render(x1 + 78, cy - 20, row);
          if (idx < rows.length - 1) {
            ctx.strokeStyle = "#e0e5e8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1 + 78, cy + 28);
            ctx.lineTo(x2 - 28, cy + 28);
            ctx.stroke();
          }
        });
      }
      return y + h + 28;
    }

    let y = 265;

    y = section(
      y,
      "RECARGOS",
      "calendar",
      guardia.recargos,
      (x, yy, r: Recargo) => {
        ctx.fillStyle = text;
        ctx.font = "bold 21px Arial";
        ctx.fillText(stripRank(r.persona), x, yy + 24);
        ctx.strokeStyle = green;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 310, yy);
        ctx.lineTo(x + 310, yy + 34);
        ctx.moveTo(x + 540, yy);
        ctx.lineTo(x + 540, yy + 34);
        ctx.stroke();
        ctx.font = "21px Arial";
        ctx.fillText(r.horario || "-", x + 337, yy + 24);
        ctx.fillText(r.detalle || "-", x + 568, yy + 24);
      },
      170
    );

    y = section(y, "FRANCOS", "franco", guardia.francos, (x, yy, p: string) => {
      ctx.fillStyle = text;
      ctx.font = "bold 22px Arial";
      ctx.fillText(stripRank(p), x, yy + 24);
    }, 150);

    y = section(
      y,
      "FRANCOS POSTERIORES",
      "plus",
      guardia.francosPost,
      (x, yy, r: FrancoPosterior) => {
        ctx.fillStyle = text;
        ctx.font = "bold 21px Arial";
        ctx.fillText(stripRank(r.persona), x, yy + 24);
        ctx.strokeStyle = green;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 380, yy);
        ctx.lineTo(x + 380, yy + 34);
        ctx.stroke();
        ctx.font = "21px Arial";
        ctx.fillText(r.detalle || "-", x + 408, yy + 24);
      },
      160
    );

    y = section(
      y,
      "NOVEDADES",
      "shield",
      guardia.novedades,
      (x, yy, r: Novedad) => {
        ctx.fillStyle = text;
        ctx.font = "bold 21px Arial";
        ctx.fillText(stripRank(r.persona) || "-", x, yy + 24);
        ctx.strokeStyle = green;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 340, yy);
        ctx.lineTo(x + 340, yy + 34);
        ctx.stroke();
        ctx.font = "21px Arial";
        ctx.fillText(r.detalle || "-", x + 368, yy + 24);
      },
      160
    );

    drawIcon(ctx, 82, y + 66, "note");
    drawRoundedRect(ctx, 150, y + 12, W - 186, 185, 24, "#e0e6ea");
    drawRoundedRect(ctx, 146, y + 8, W - 182, 185, 24, "#fff", line);
    drawRoundedRect(ctx, 146, y + 8, 425, 66, 20, navy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 29px Arial";
    ctx.fillText("OBSERVACIONES", 180, y + 52);
    ctx.strokeStyle = green;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(600, y + 42);
    ctx.lineTo(W - 66, y + 42);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = "22px Arial";
    wrapCanvas(ctx, guardia.observaciones, W - 260).slice(0, 3).forEach((l, i) => ctx.fillText(l, 188, y + 105 + i * 32));

    const footerY = H - 96;
    drawRoundedRect(ctx, 28, footerY, W - 56, 68, 24, navy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 25px Arial";
    ctx.fillText("Confirmar recepción cuando sea requerido.", 184, footerY + 43);

    return canvas;
  }

  function generarJPG() {
    const guardia = currentGuardia;
    saveGuardiaToHistory(guardia);
    const canvas = generateReportCanvas(guardia);
    downloadCanvas(canvas, `centinelas_turno_b_${guardia.fecha.replace(/\//g, "-")}.jpg`);
    alert("JPG generado. El historial de esta fecha fue actualizado sin duplicar la guardia.");
  }

  function generarComparativo() {
    const canvas = document.createElement("canvas");
    const scale = 2;
    const W = 1500;
    const rowH = 86;
    const H = 260 + personal.length * rowH + 130;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    const navy = "#0b2d42";
    const green = "#2e7d6a";
    const text = "#10212d";

    ctx.fillStyle = "#eef3f6";
    ctx.fillRect(0, 0, W, H);
    drawRoundedRect(ctx, 20, 20, W - 40, H - 40, 30, "transparent", navy);
    drawRoundedRect(ctx, 36, 36, W - 72, 150, 26, navy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px Arial";
    ctx.fillText("COMPARATIVO MENSUAL DE RECARGOS", 70, 102);
    ctx.fillStyle = "#d5f3e7";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`Turno B | ${String(month).padStart(2, "0")}/${year} | Mañana 07-13 | Tarde 13-20 | Noche 20 en adelante`, 72, 142);

    const heads = [
      ["Personal", 70],
      ["Mañana", 460],
      ["Tarde", 585],
      ["Noche", 705],
      ["Total", 825],
      ["Francos", 940],
      ["Noved.", 1070],
      ["Últimos recargos", 1190],
    ] as const;

    ctx.fillStyle = navy;
    ctx.font = "bold 21px Arial";
    heads.forEach(([label, x]) => ctx.fillText(label, x, 225));

    const maxRec = Math.max(1, ...personal.map((p) => stats[p]?.total || 0));
    let y = 267;
    for (const p of personal) {
      const s = stats[p] || { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
      const ratio = s.total / maxRec;
      ctx.fillStyle = ratio < 0.34 ? "#f3f7f9" : ratio < 0.67 ? "#e3f4ee" : "#c9eadf";
      drawRoundedRect(ctx, 50, y, W - 100, 66, 15, ctx.fillStyle as string, "#dfe6e8");
      ctx.fillStyle = text;
      ctx.font = "bold 21px Arial";
      ctx.fillText(stripRank(p), 70, y + 38);
      ctx.fillStyle = navy;
      ctx.font = "bold 22px Arial";
      ctx.fillText(String(s.manana), 500, y + 38);
      ctx.fillText(String(s.tarde), 620, y + 38);
      ctx.fillText(String(s.noche), 740, y + 38);
      ctx.fillText(String(s.total), 855, y + 38);
      ctx.fillText(String(s.francos), 980, y + 38);
      ctx.fillText(String(s.novedades), 1110, y + 38);
      ctx.fillStyle = text;
      ctx.font = "16px Arial";
      const detail = s.detalle.slice(-2).join("; ") || "-";
      wrapCanvas(ctx, detail, 260).slice(0, 2).forEach((l, i) => ctx.fillText(l, 1190, y + 22 + i * 20));
      y += rowH;
    }

    drawRoundedRect(ctx, 36, H - 90, W - 72, 54, 18, navy);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 19px Arial";
    ctx.fillText("Objetivo: distribuir recargos y francos de forma pareja durante el mes.", 70, H - 56);

    downloadCanvas(canvas, `comparativo_mensual_turno_b_${String(month).padStart(2, "0")}-${year}.jpg`);
  }

  function addPerson() {
    const name = prompt("Ingrese jerarquía y nombre del personal:");
    if (!name?.trim()) return;
    if (personal.includes(name.trim())) return alert("Ese personal ya está cargado.");
    setPersonal((prev) => [...prev, name.trim()].sort((a, b) => a.localeCompare(b)));
  }

  function editPerson(oldName: string) {
    const name = prompt("Modificar jerarquía y nombre:", oldName);
    if (!name?.trim()) return;
    setPersonal((prev) => prev.map((p) => (p === oldName ? name.trim() : p)));
    setHistory((prev) =>
      prev.map((g) => ({
        ...g,
        recargos: g.recargos.map((r) => ({ ...r, persona: r.persona === oldName ? name.trim() : r.persona })),
        francos: g.francos.map((p) => (p === oldName ? name.trim() : p)),
        francosPost: g.francosPost.map((f) => ({ ...f, persona: f.persona === oldName ? name.trim() : f.persona })),
        novedades: g.novedades.map((n) => ({ ...n, persona: n.persona === oldName ? name.trim() : n.persona })),
      }))
    );
  }

  function removePerson(name: string) {
    if (!confirm(`¿Quitar a ${name} del listado? El historial anterior no se borra.`)) return;
    setPersonal((prev) => prev.filter((p) => p !== name));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ personal, history }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respaldo_centinelas_turno_b_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.personal)) setPersonal(data.personal);
        if (Array.isArray(data.history)) setHistory(data.history);
        alert("Respaldo importado correctamente.");
      } catch {
        alert("No se pudo importar el archivo.");
      }
    };
    reader.readAsText(file);
  }

  if (!hydrated) return <main className="app">Cargando...</main>;

  return (
    <main className="app">
      <div className="topbar">
        <Link href="/" className="back-link">← Inicio</Link>
        <span>Suite Operativa</span>
      </div>

      <header className="header">
        <span className="eyebrow">Turno B</span>
        <h1>Recargos y Francos</h1>
        <div className="green-line" />
        <div className="sub">Carga diaria, historial mensual, personal y respaldos con una identidad visual unificada.</div>
      </header>

      <nav className="tabs">
        <button className={tab === "carga" ? "active" : ""} onClick={() => setTab("carga")}>Carga diaria</button>
        <button className={tab === "historial" ? "active" : ""} onClick={() => setTab("historial")}>Historial mensual</button>
        <button className={tab === "personal" ? "active" : ""} onClick={() => setTab("personal")}>Personal</button>
        <button className={tab === "respaldo" ? "active" : ""} onClick={() => setTab("respaldo")}>Respaldo</button>
      </nav>

      {tab === "carga" && (
        <section className="grid">
          <div className="card">
            <h2>Datos generales</h2>
            <div className="grid two">
              <label>
                Fecha de guardia
                <input value={fecha} onChange={(e) => setFecha(e.target.value)} placeholder="15/05/2026" />
              </label>
              <label>
                Oficial de Servicio
                <input list="oficiales" value={oficial} onChange={(e) => setOficial(e.target.value)} />
                <datalist id="oficiales">
                  {OFICIALES.map((o) => <option key={o} value={o} />)}
                </datalist>
              </label>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title"><span className="icon">📅</span> Recargos</h2>
            {recargos.map((r, i) => (
              <div className="row" key={i}>
                <select value={r.persona} onChange={(e) => updateRecargo(i, { persona: e.target.value })}>
                  <option value="">Personal</option>
                  {personal.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={r.horario} onChange={(e) => updateRecargo(i, { horario: e.target.value })} placeholder="07:00 a 13:00" />
                <input value={r.detalle} onChange={(e) => updateRecargo(i, { detalle: e.target.value })} placeholder="GSE / HIGA / otro" />
                <button className="secondary" onClick={() => updateRecargo(i, emptyRecargo())}>Limpiar</button>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="section-title"><span className="icon">🚪</span> Francos del día siguiente</h2>
            <div className="checklist">
              {personal.map((p) => (
                <label className="checkitem" key={p}>
                  <input
                    type="checkbox"
                    checked={francos.includes(p)}
                    onChange={(e) => setFrancos((prev) => e.target.checked ? [...prev, p] : prev.filter((x) => x !== p))}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="section-title"><span className="icon">➕</span> Francos posteriores</h2>
            {francosPost.map((r, i) => (
              <div className="row two-cols" key={i}>
                <select value={r.persona} onChange={(e) => updatePost(i, { persona: e.target.value })}>
                  <option value="">Personal</option>
                  {personal.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={r.detalle} onChange={(e) => updatePost(i, { detalle: e.target.value })} placeholder="Fecha / detalle" />
                <button className="secondary" onClick={() => updatePost(i, emptyPost())}>Limpiar</button>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="section-title"><span className="icon">🛡️</span> Novedades</h2>
            {novedades.map((r, i) => (
              <div className="row two-cols" key={i}>
                <select value={r.persona} onChange={(e) => updateNovedad(i, { persona: e.target.value })}>
                  <option value="">Personal</option>
                  {personal.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={r.detalle} onChange={(e) => updateNovedad(i, { detalle: e.target.value })} placeholder="Artículo 175 / carpeta médica / otro" />
                <button className="secondary" onClick={() => updateNovedad(i, emptyNov())}>Limpiar</button>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="section-title"><span className="icon">📝</span> Observaciones</h2>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </section>
      )}

      {tab === "historial" && (
        <section className="grid">
          <div className="card">
            <h2>Historial mensual</h2>
            <div className="grid three">
              <label>Mes
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label>Año
                <input value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </label>
              <div>
                <button className="success" onClick={generarComparativo}>Exportar comparativo JPG</button>
              </div>
            </div>
            <p className="small">Mañana: 07:00 a 13:00 | Tarde: 13:00 a 20:00 | Noche: 20:00 en adelante. Una fecha de guardia se guarda una sola vez; si se vuelve a generar, reemplaza la versión anterior.</p>
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Personal</th>
                  <th>Guardias</th>
                  <th>Mañana</th>
                  <th>Tarde</th>
                  <th>Noche</th>
                  <th>Total rec.</th>
                  <th>Francos</th>
                  <th>Noved.</th>
                </tr>
              </thead>
              <tbody>
                {personal.map((p) => {
                  const s = stats[p] || { guardias: 0, manana: 0, tarde: 0, noche: 0, total: 0, francos: 0, novedades: 0, detalle: [] };
                  return (
                    <tr key={p} onClick={() => setSelectedPerson(p)} style={{ cursor: "pointer", background: selectedPerson === p ? "#e3f4ee" : undefined }}>
                      <td><strong>{stripRank(p)}</strong></td>
                      <td><span className="badge">{s.guardias}</span></td>
                      <td><span className="badge">{s.manana}</span></td>
                      <td><span className="badge">{s.tarde}</span></td>
                      <td><span className="badge">{s.noche}</span></td>
                      <td><span className="badge">{s.total}</span></td>
                      <td><span className="badge">{s.francos}</span></td>
                      <td><span className="badge">{s.novedades}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Detalle por persona</h2>
            {!selectedPerson ? (
              <p>Seleccioná una persona de la tabla.</p>
            ) : (
              <>
                <h3>{selectedPerson}</h3>
                <p>
                  Recargos: <strong>{selectedStats?.total || 0}</strong> |
                  Mañana: <strong>{selectedStats?.manana || 0}</strong> |
                  Tarde: <strong>{selectedStats?.tarde || 0}</strong> |
                  Noche: <strong>{selectedStats?.noche || 0}</strong> |
                  Francos: <strong>{selectedStats?.francos || 0}</strong>
                </p>
                <ul>
                  {(selectedStats?.detalle || []).map((d, i) => <li key={i}>{d}</li>)}
                  {(!selectedStats?.detalle || selectedStats.detalle.length === 0) && <li>Sin recargos registrados en este mes.</li>}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {tab === "personal" && (
        <section className="grid">
          <div className="card">
            <h2>Gestión de personal</h2>
            <div className="actions">
              <button className="success" onClick={addPerson}>Agregar personal</button>
            </div>
          </div>

          <div className="card">
            {personal.map((p) => (
              <div className="person-item" key={p}>
                <strong>{p}</strong>
                <button className="secondary" onClick={() => editPerson(p)}>Editar</button>
                <button className="danger" onClick={() => removePerson(p)}>Quitar</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "respaldo" && (
        <section className="grid">
          <div className="card">
            <h2>Respaldo de datos</h2>
            <div className="notice">
              Esta versión guarda los datos en el navegador del dispositivo. En iPhone funciona bien, pero para no perder datos conviene exportar un respaldo periódicamente. Para usar la misma información en varios dispositivos, después conviene conectar una base de datos.
            </div>
            <div className="actions">
              <button className="success" onClick={exportBackup}>Exportar respaldo JSON</button>
              <button className="secondary" onClick={() => fileInput.current?.click()}>Importar respaldo JSON</button>
              <input ref={fileInput} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
              <button className="danger" onClick={() => confirm("¿Borrar todo el historial?") && setHistory([])}>Borrar historial</button>
            </div>
          </div>
        </section>
      )}

      <div className="footer-actions">
        <button className="success" onClick={generarJPG}>Generar JPG</button>
        <button className="secondary" onClick={() => setTab("historial")}>Historial</button>
      </div>
    </main>
  );
}
