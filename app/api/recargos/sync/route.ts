import { NextResponse } from "next/server";
import { getSupabaseConfig, supabaseRest } from "../../../../lib/supabaseRest";

export const runtime = "nodejs";

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

type PersonalRow = { nombre: string; activo?: boolean };
type GuardiaRow = {
  fecha: string;
  fecha_key: string;
  oficial: string | null;
  observaciones: string | null;
  creado: string | null;
  recargos: Recargo[] | null;
  francos: string[] | null;
  francos_post: FrancoPosterior[] | null;
  novedades: Novedad[] | null;
};

function rowToGuardia(row: GuardiaRow): Guardia {
  return {
    fecha: row.fecha,
    fechaKey: row.fecha_key,
    oficial: row.oficial || "",
    creado: row.creado || new Date().toISOString(),
    recargos: row.recargos || [],
    francos: row.francos || [],
    francosPost: row.francos_post || [],
    novedades: row.novedades || [],
    observaciones: row.observaciones || "",
  };
}

function guardiaToRow(guardia: Guardia) {
  return {
    fecha: guardia.fecha,
    fecha_key: guardia.fechaKey,
    oficial: guardia.oficial || null,
    observaciones: guardia.observaciones || null,
    creado: guardia.creado || new Date().toISOString(),
    recargos: guardia.recargos || [],
    francos: guardia.francos || [],
    francos_post: guardia.francosPost || [],
    novedades: guardia.novedades || [],
  };
}

function normalizePersonal(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeHistory(value: unknown): Guardia[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Guardia)
    .filter((item) => item?.fecha && item?.fechaKey)
    .map((item) => ({
      fecha: String(item.fecha),
      fechaKey: String(item.fechaKey),
      oficial: String(item.oficial || ""),
      creado: String(item.creado || new Date().toISOString()),
      recargos: Array.isArray(item.recargos) ? item.recargos : [],
      francos: Array.isArray(item.francos) ? item.francos : [],
      francosPost: Array.isArray(item.francosPost) ? item.francosPost : [],
      novedades: Array.isArray(item.novedades) ? item.novedades : [],
      observaciones: String(item.observaciones || ""),
    }))
    .sort((a, b) => (a.fechaKey > b.fechaKey ? 1 : -1));
}

async function deletePersonalNotIn(personal: string[]) {
  const existing = await supabaseRest<PersonalRow[]>("recargos_personal?select=nombre");
  const wanted = new Set(personal);
  const toDelete = existing.map((row) => row.nombre).filter((nombre) => !wanted.has(nombre));

  await Promise.all(
    toDelete.map((nombre) =>
      supabaseRest(`recargos_personal?nombre=eq.${encodeURIComponent(nombre)}`, {
        method: "DELETE",
      })
    )
  );
}

async function deleteGuardiasNotIn(history: Guardia[]) {
  const existing = await supabaseRest<{ fecha_key: string }[]>("recargos_guardias?select=fecha_key");
  const wanted = new Set(history.map((guardia) => guardia.fechaKey));
  const toDelete = existing.map((row) => row.fecha_key).filter((fechaKey) => !wanted.has(fechaKey));

  await Promise.all(
    toDelete.map((fechaKey) =>
      supabaseRest(`recargos_guardias?fecha_key=eq.${encodeURIComponent(fechaKey)}`, {
        method: "DELETE",
      })
    )
  );
}

export async function GET() {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ configured: false, personal: [], history: [] });
  }

  try {
    const [personalRows, guardiaRows] = await Promise.all([
      supabaseRest<PersonalRow[]>("recargos_personal?select=nombre,activo&activo=eq.true&order=nombre.asc"),
      supabaseRest<GuardiaRow[]>("recargos_guardias?select=*&order=fecha_key.asc"),
    ]);

    return NextResponse.json({
      configured: true,
      personal: personalRows.map((row) => row.nombre),
      history: guardiaRows.map(rowToGuardia),
    });
  } catch (error) {
    return NextResponse.json(
      { configured: true, error: error instanceof Error ? error.message : "No se pudo leer Supabase." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ configured: false, saved: false });
  }

  try {
    const body = await request.json();
    const personal = normalizePersonal(body.personal);
    const history = normalizeHistory(body.history);

    await deletePersonalNotIn(personal);
    if (personal.length) {
      await supabaseRest("recargos_personal?on_conflict=nombre", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify(personal.map((nombre) => ({ nombre, activo: true }))),
      });
    }

    await deleteGuardiasNotIn(history);
    if (history.length) {
      await supabaseRest("recargos_guardias?on_conflict=fecha_key", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify(history.map(guardiaToRow)),
      });
    }

    return NextResponse.json({ configured: true, saved: true });
  } catch (error) {
    return NextResponse.json(
      { configured: true, saved: false, error: error instanceof Error ? error.message : "No se pudo sincronizar Supabase." },
      { status: 500 }
    );
  }
}
