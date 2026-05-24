# Suite SPB - Herramientas Operativas

Proyecto unificado para Vercel con una página principal y herramientas internas orientadas a facilitar tareas de trabajo en el SPB (Servicio Penitenciario Bonaerense).

## Rutas actuales

- `/` — página principal de la suite.
- `/recargos` — Recargos y Francos Turno B, con historial mensual y personal.
- `/licencias` — Planificador de Licencias.

## Objetivo del proyecto

La idea es mantener una sola web principal y sumar herramientas como módulos independientes. Cada herramienta puede tener su propia ruta, su propia lógica y sus propios componentes, pero todas comparten la misma identidad visual, paleta de colores y estructura de navegación.

## Qué incluye esta versión

- Se integraron ambos proyectos dentro de una sola app Next.js.
- Se convirtió el Planificador de Licencias de Flask/Python a React/TypeScript para que pueda vivir dentro del mismo despliegue de Vercel.
- Se creó una landing principal enfocada en herramientas para facilitar el trabajo en el SPB.
- Se unificó la paleta visual con base azul petróleo, acentos verdes, tarjetas claras, bordes suaves y sombras consistentes.
- Se centralizó la lista de herramientas en `app/herramientas.ts` para que la página principal sea fácil de mantener.
- Se ajustaron los reportes JPG de Recargos para que usen la nueva identidad visual.
- Se agregó persistencia opcional con Supabase/Postgres para el historial mensual y la nómina de personal de Recargos.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir:

```txt
http://localhost:3000
```

## Desplegar en Vercel

1. Subir esta carpeta a un repositorio de GitHub.
2. En Vercel, crear un nuevo proyecto desde ese repositorio.
3. Framework Preset: `Next.js`.
4. Build Command: `next build` o dejar el valor por defecto.
5. Output Directory: dejar vacío/default.
6. Deploy.

## Base de datos para Recargos

La herramienta `/recargos` funciona en dos modos:

- **Modo local:** si no configurás Supabase, guarda historial y personal en el navegador como antes.
- **Modo base conectada:** si configurás Supabase, sincroniza automáticamente el historial mensual y el personal en Postgres.

### 1. Crear las tablas en Supabase

En Supabase, abrir:

```txt
SQL Editor → New query
```

Copiar y ejecutar el contenido de:

```txt
database/supabase-schema.sql
```

Ese script crea:

- `recargos_personal`
- `recargos_guardias`
- índices por mes/año y fecha
- triggers para actualizar fecha de modificación
- RLS activado sin policies públicas

La app usa API routes del servidor con `SUPABASE_SERVICE_ROLE_KEY`, por eso no hace falta exponer permisos públicos de escritura.

### 2. Configurar variables locales

Crear un archivo `.env.local` basado en `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

El valor `SUPABASE_SERVICE_ROLE_KEY` se obtiene en Supabase:

```txt
Project Settings → API → service_role key
```

Importante: esa clave solo debe estar en `.env.local` y en Vercel. No debe escribirse dentro del código ni subirse públicamente.

### 3. Configurar variables en Vercel

En Vercel:

```txt
Project Settings → Environment Variables
```

Agregar:

```txt
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Después hacer redeploy.

### 4. Verificar conexión

Entrar a:

```txt
/recargos
```

Arriba de las pestañas vas a ver el estado:

- `Base conectada`: Supabase está activo.
- `Modo local`: faltan variables de entorno.
- `Sin conexión`: las variables están, pero la app no pudo leer/escribir la base.

Cuando generás un JPG, la guardia se guarda en el historial y se sincroniza automáticamente si la base está conectada.

## Agregar una nueva herramienta

### 1. Crear una ruta nueva

Crear una carpeta dentro de `app`, por ejemplo:

```txt
app/nueva-herramienta/page.tsx
```

Ejemplo mínimo:

```tsx
import Link from "next/link";

export default function NuevaHerramientaPage() {
  return (
    <main className="app">
      <div className="topbar">
        <Link href="/" className="back-link">← Volver al inicio</Link>
        <span>Suite SPB</span>
      </div>

      <section className="header app-hero compact">
        <h1>Nueva herramienta</h1>
        <p className="sub">Descripción breve de qué problema resuelve esta herramienta.</p>
        <div className="green-line" />
      </section>

      <section className="card">
        <h2>Contenido</h2>
        <p>Acá va la lógica, formulario o pantalla principal.</p>
      </section>
    </main>
  );
}
```

### 2. Agregar la tarjeta en la página principal

Editar `app/herramientas.ts` y sumar un objeto al array `herramientas`:

```ts
{
  href: "/nueva-herramienta",
  eyebrow: "Área o categoría",
  title: "Nueva herramienta",
  description: "Descripción corta para mostrar en la página principal.",
  stats: ["Dato 1", "Dato 2", "Dato 3"],
  status: "Disponible",
}
```

Con eso aparece automáticamente en la página de inicio.

### 3. Mantener el estilo común

Usar las clases ya existentes cuando sea posible:

- `app` para el contenedor general.
- `topbar` para la barra superior.
- `back-link` para volver al inicio.
- `header` y `app-hero compact` para el encabezado.
- `card` para bloques de contenido.
- `grid two` o `grid three` para grillas.
- `button-link`, `primary`, `secondary`, `success` y `danger` para acciones.

Los colores principales están definidos en `app/globals.css` dentro de `:root`. Cambiando esas variables se modifica la identidad visual de toda la suite.
