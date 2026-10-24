import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN } from "@/lib/routes";
import { tieneAcceso } from "@/lib/ecos";
import { useEcosMembers } from "@/lib/ecos-admin-store";
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
  [ADMIN.finanzas]: "Proyección vs. real del mes",
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
 * Portada de la Torre, al estilo del Inicio del club: saludo con lo que pide
 * atención hoy sobre el elefante, lo de hoy en cuatro tarjetas y un acceso con ícono
 * a cada sección. Debajo siguen las ventas de siempre.
 */
/** `children` va justo después del saludo: ahí vive el tablero de números. */
export function AdminPortada({ children }: { children?: ReactNode } = {}) {
  const { profile } = useAuth();
  const { data: miembros, loading: cargandoMiembros } = useEcosMembers();
  const { data: solicitudes, loading: cargandoSolicitudes } = useRequests();
  const procesos = useProcesosAdmin();
  const ultimo = useUltimoCorreo();

  const conAcceso = miembros.filter((m) => tieneAcceso(m)).length;
  const desde = Date.now() - SEMANA;
  const nuevos = miembros.filter((m) => new Date(m.created_at).getTime() >= desde).length;
  const pendientes = solicitudes.filter((r) => r.status === "pendiente").length;
  const activos = procesos.programas.filter((p) => p.estado === "activo").length;
  const nombre = (profile?.name || "").split(" ")[0];

  // Una frase con lo que pide atención hoy, con lo que ya cargó; «todo al día»
  // solo cuando se sabe de las dos cosas.
  const pendientesHoy = [
    !cargandoSolicitudes && pendientes > 0 && `${pendientes} ${pendientes === 1 ? "solicitud por revisar" : "solicitudes por revisar"}`,
    !cargandoMiembros && nuevos > 0 && `${nuevos} ${nuevos === 1 ? "miembro nuevo" : "miembros nuevos"} en ECOS esta semana`,
  ].filter(Boolean) as string[];
  const resumen = pendientesHoy.length ? `Tienes ${pendientesHoy.join(" y ")}.`
    : !cargandoMiembros && !cargandoSolicitudes ? "Todo está al día. Aquí tienes cada sección a un clic."
    : "Aquí tienes cada sección a un clic.";

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
            <p className="adm-hoy-eyebrow">Torre de control</p>
            <h1 className="adm-hoy-titulo">{saludo()}{nombre ? `, ${nombre}` : ""}</h1>
            <p className="adm-hoy-resumen">{resumen}</p>
          </div>
        </div>
      </section>

      {children}

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
        {NAV.filter((n) => n.href !== ADMIN.home && !(n.soloAdmin && profile?.role === "vendor")).map((n) => (
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
