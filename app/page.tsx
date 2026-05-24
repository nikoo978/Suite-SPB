import Link from "next/link";
import { herramientas, suiteInfo } from "./herramientas";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">{suiteInfo.eyebrow}</span>
          <h1>{suiteInfo.title}</h1>
          <p>{suiteInfo.description}</p>
          <div className="hero-actions">
            {herramientas.slice(0, 2).map((herramienta, index) => (
              <Link
                href={herramienta.href}
                className={`button-link ${index === 0 ? "primary" : "secondary"}`}
                key={herramienta.href}
              >
                Abrir {herramienta.title}
              </Link>
            ))}
          </div>
        </div>

        <aside className="hero-panel" aria-label="Resumen de herramientas">
          <div className="panel-orb">{herramientas.length}</div>
          <strong>Herramientas integradas</strong>
          <span>Una sola app Next.js preparada para Vercel, mantenimiento simple y rutas independientes.</span>
        </aside>
      </section>

      <section className="landing-maintenance" aria-label="Mantenimiento y crecimiento">
        <div>
          <span className="eyebrow">Mantenimiento</span>
          <h2>{suiteInfo.maintenanceTitle}</h2>
          <p>{suiteInfo.maintenanceDescription}</p>
        </div>
        <div className="maintenance-steps" aria-label="Pasos para agregar una herramienta">
          <span>1. Crear ruta</span>
          <span>2. Agregar tarjeta</span>
          <span>3. Subir a GitHub</span>
        </div>
      </section>

      <section className="project-grid" aria-label="Herramientas disponibles">
        {herramientas.map((herramienta) => (
          <Link href={herramienta.href} className="project-card" key={herramienta.href}>
            <div className="project-card-topline">
              <span className="eyebrow">{herramienta.eyebrow}</span>
              <span className="status-pill">{herramienta.status}</span>
            </div>
            <h2>{herramienta.title}</h2>
            <p>{herramienta.description}</p>
            <div className="project-tags">
              {herramienta.stats.map((stat) => <span key={stat}>{stat}</span>)}
            </div>
            <strong className="project-open">Entrar →</strong>
          </Link>
        ))}
      </section>
    </main>
  );
}
