import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN } from "@/lib/routes";
import { fmtDate, SESSION_KIND_LABEL, SUBJECT_LABEL, tieneAcceso } from "@/lib/ecos";
import { nextSession } from "@/lib/club-store";
import { useEcosMembers, useEcosSessions } from "@/lib/ecos-admin-store";
import { useRequests } from "@/lib/admin-store";
import { useProcesosAdmin } from "@/lib/proceso";
import { useCorreosApi, type Envio } from "@/lib/correos";
import { NAV } from "@/components/admin/sidebar";

/** Lo que dice cada acceso debajo del nombre. Las secciones son las del menú. */
const SUBTITULOS: Record<string, string> = {
  [ADMIN.home]: "Ventas, transacciones y reportes",
  [ADMIN.productos]: "Productos, vendedores y solicitudes",
  [ADMIN.resenas]: "Lo que dicen tus clientes",
  [ADMIN.instagram]: "Publicaciones del sitio",
  [ADMIN.ecos]: "Miembros, clases y comisiones",
  [ADMIN.clientes]: "El proceso de cada cliente",
  [ADMIN.correos]: "Boletines e invitaciones",
  [ADMIN.test]: "Autodescubrimiento y dinero",
  [ADMIN.configuracion]: "Usuarios, ajustes y auditoría",
};

const SEMANA = 7 * 86400000;

function saludo(h = new Date().getHours()) {
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

const fechaCorta = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "";
};

/**
 * Portada de la Torre, al estilo del Inicio del club: saludo con la próxima
 * clase sobre el elefante, lo de hoy en cuatro tarjetas y un acceso con ícono
 * a cada sección. Debajo siguen las ventas de siempre.
 */
export function AdminPortada() {
  const { profile } = useAuth();
  const { data: sesiones, loading: cargandoSesiones } = useEcosSessions();
  const { data: miembros, loading: cargandoMiembros } = useEcosMembers();
  const { data: solicitudes, loading: cargandoSolicitudes } = useRequests();
  const procesos = useProcesosAdmin();
  const ultimo = useUltimoCorreo();

  const proxima = useMemo(() => nextSession(sesiones.filter((s) => s.published)), [sesiones]);
  const conAcceso = miembros.filter((m) => tieneAcceso(m)).length;
  const desde = Date.now() - SEMANA;
  const nuevos = miembros.filter((m) => new Date(m.created_at).getTime() >= desde).length;
  const pendientes = solicitudes.filter((r) => r.status === "pendiente").length;
  const activos = procesos.programas.filter((p) => p.estado === "activo").length;
  const nombre = (profile?.name || "").split(" ")[0];

  return (
    <>
      <section className="adm-hoy-hero" aria-label="Bienvenida">
        <div className="adm-hoy-marca">
          <div className="adm-hoy-placa" aria-hidden="true"><span>HGG</span></div>
          <span className="adm-hoy-cat">Torre</span>
          <span className="adm-hoy-fecha">{new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <div className="adm-hoy-cuerpo">
          <img className="adm-hoy-bg" src="/hero-elefante-bg.jpg" alt="" />
          <span className="adm-hoy-velo" />
          <div className="adm-hoy-texto">
            <p className="adm-hoy-saludo">{saludo()}{nombre ? `, ${nombre}` : ""}</p>
            {cargandoSesiones ? <p className="adm-hoy-when">Cargando…</p> : proxima ? (
              <>
                <p className="adm-hoy-eyebrow">Próxima sesión de ECOS · {SESSION_KIND_LABEL[proxima.kind]}{proxima.subject !== "abierta" ? ` de ${SUBJECT_LABEL[proxima.subject]}` : ""}</p>
                <h1 className="adm-hoy-titulo">{proxima.title}</h1>
                <p className="adm-hoy-when">{fmtDate(proxima.starts_at, true)}{proxima.teacher ? ` · con ${proxima.teacher}` : ""}</p>
              </>
            ) : (
              <>
                <p className="adm-hoy-eyebrow">ECOS</p>
                <h1 className="adm-hoy-titulo">No hay sesiones programadas.</h1>
              </>
            )}
            <div className="adm-hoy-acciones">
              <Link to={ADMIN.ecos} className="adm-cta-btn">Abrir ECOS</Link>
              {proxima?.zoom_url && <a href={proxima.zoom_url} target="_blank" rel="noopener noreferrer" className="adm-hoy-link">Zoom →</a>}
            </div>
          </div>
        </div>
      </section>

      <h2 className="adm-hoy-fila">Hoy</h2>
      <div className="adm-hoy-tarjetas">
        <Tarjeta to={ADMIN.ecos} titulo="Miembros con acceso" valor={cargandoMiembros ? "…" : String(conAcceso)}
          nota={cargandoMiembros ? "" : nuevos > 0 ? `${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"} esta semana` : "Sin registros nuevos esta semana"} destacar={nuevos > 0} />
        <Tarjeta to={ADMIN.solicitudes} titulo="Solicitudes por revisar" valor={cargandoSolicitudes ? "…" : String(pendientes)}
          nota={cargandoSolicitudes ? "" : pendientes > 0 ? "Esperan tu aprobación" : "Todo al día"} destacar={pendientes > 0} />
        <Tarjeta to={ADMIN.clientes} titulo="Clientes en proceso" valor={procesos.loading ? "…" : String(activos)}
          nota={procesos.loading ? "" : `${procesos.programas.length} programas en total`} />
        <Tarjeta to={ADMIN.correos} titulo="Último correo" valor={ultimo === undefined ? "…" : ultimo ? fechaCorta(ultimo.sent_at ?? ultimo.scheduled_at ?? ultimo.created_at) : "—"}
          nota={ultimo === undefined ? "" : ultimo ? `${ultimo.status === "scheduled" ? "Programado · " : ""}${ultimo.name}` : "Todavía no hay envíos"} texto />
      </div>

      <h2 className="adm-hoy-fila">Secciones</h2>
      <nav className="adm-hoy-accesos" aria-label="Secciones del panel">
        {NAV.filter((n) => n.href !== ADMIN.home).map((n) => (
          <Link key={n.href} to={n.href} className="adm-hoy-acceso">
            <span className="adm-hoy-acceso-icono">{n.icon}</span>
            <span className="adm-hoy-acceso-label">{n.label}</span>
            <span className="adm-hoy-acceso-sub">{SUBTITULOS[n.href] ?? ""}</span>
          </Link>
        ))}
      </nav>

      <h2 className="adm-hoy-fila">Ventas</h2>
    </>
  );
}

function Tarjeta({ to, titulo, valor, nota, destacar, texto }: {
  to: string; titulo: string; valor: string; nota: string; destacar?: boolean; texto?: boolean;
}) {
  return (
    <Link to={to} className={`adm-hoy-tarjeta${destacar ? " is-on" : ""}`}>
      <span className="adm-hoy-tarjeta-titulo">{titulo}</span>
      <span className={`adm-hoy-tarjeta-valor${texto ? " is-texto" : ""}`}>{valor}</span>
      <span className="adm-hoy-tarjeta-nota">{nota}</span>
    </Link>
  );
}

/** El envío más reciente de Resend. undefined = cargando; null = ninguno o sin conexión. */
function useUltimoCorreo(): Envio | null | undefined {
  const api = useCorreosApi();
  const [ultimo, setUltimo] = useState<Envio | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    api<{ envios: Envio[] }>("historial")
      .then((r) => {
        const visibles = r.envios.filter((e) => e.status !== "draft" && e.status !== "canceled");
        visibles.sort((a, b) => (b.sent_at ?? b.scheduled_at ?? b.created_at).localeCompare(a.sent_at ?? a.scheduled_at ?? a.created_at));
        if (vivo) setUltimo(visibles[0] ?? null);
      })
      .catch(() => { if (vivo) setUltimo(null); });
    return () => { vivo = false; };
  }, [api]);
  return ultimo;
}
