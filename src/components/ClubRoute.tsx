import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { CLUB } from "@/lib/routes";
import { isFounderWindowOpen, tieneAcceso } from "@/lib/ecos";
import { getSupabase } from "@/lib/supabase";
import { leerReferido } from "@/lib/referido";

/** Segundos que se espera al webhook antes de darse por vencido. */
const ESPERA_MAX = 40_000;
const CADA = 2_000;

/**
 * Puerta del panel de miembros. Exige sesión, nada más: quien no tiene acceso
 * igual entra y ve el club con candados (ClubLayout → PanelBloqueado). Pedir la
 * tarjeta en la puerta espantaba a la gente.
 *
 * Es deliberadamente distinta de ProtectedRoute (la del admin): aquí no se
 * mira el rol, se mira `ecos_members.status`, que solo escribe el webhook de
 * Stripe. Quien cancela pierde el acceso solo; quien paga lo recupera solo.
 * Lo que hay detrás de cada candado lo protege además la base (RLS).
 *
 * Al volver del pago hay una carrera: Stripe devuelve a la persona en cuanto
 * cobra, pero el webhook tarda un momento en escribir «activo». Quien llegaba
 * en ese hueco veía «falta un paso para entrar» con el pago ya hecho, y la
 * pantalla nunca volvía a mirar. Por eso aquí se espera al webhook.
 */
export default function ClubRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { member, loading, refresh } = useClub();
  const location = useLocation();

  const vienePago = /[?&](pago|bienvenida)=/.test(location.search);
  // El profesor entra sin pagar: da una de las materias, su acceso no depende
  // de Stripe.
  const activo = tieneAcceso(member);
  const [esperando, setEsperando] = useState(vienePago);
  const desde = useRef(Date.now());

  // Mes gratis: quien se registró y todavía no tiene ficha (o la tiene sin
  // lugar de fundador porque el cupo estaba lleno) pide entrar a la prueba.
  // La base decide si hay cupo; aquí solo se pregunta una vez por visita.
  const [uniendo, setUniendo] = useState(false);
  const pidio = useRef(false);
  const puedeUnirse = !!session && !loading && !activo && isFounderWindowOpen() &&
    (!member || (member.status === "pendiente" && !member.founder));
  useEffect(() => {
    if (!puedeUnirse || pidio.current) return;
    pidio.current = true;
    setUniendo(true);
    void (async () => {
      // Quién lo trajo queda guardado desde ya: la activación puede ser días
      // después, en otro navegador.
      const { error } = await getSupabase().rpc("ecos_unirse_prueba", { p_ref: leerReferido() })
        .then((r) => r, (e: unknown) => ({ error: e }));
      if (error) console.error("[ecos] no se pudo abrir el mes gratis:", error);
      await refresh();
      setUniendo(false);
    })();
  }, [puedeUnirse, refresh]);

  useEffect(() => {
    if (!esperando || activo || authLoading || !session) return;
    const t = setInterval(() => {
      if (Date.now() - desde.current > ESPERA_MAX) { setEsperando(false); return; }
      void refresh();
    }, CADA);
    return () => clearInterval(t);
  }, [esperando, activo, authLoading, session, refresh]);

  useEffect(() => { if (activo) setEsperando(false); }, [activo]);

  // Bienvenida: la función manda el correo a la persona y el aviso a Holman, una
  // sola vez por persona (lo controla el servidor). Aquí solo se evita volver a
  // preguntar en cada pantalla de la misma visita.
  const memberId = member?.id;
  useEffect(() => {
    if (!memberId || uniendo) return;
    const clave = `ecos_bienvenida_${memberId}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento: igual se pregunta */ }
    void getSupabase().functions.invoke("ecos-bienvenida", { body: {} }).catch(() => undefined);
  }, [memberId, uniendo]);

  // Mientras se abre el mes gratis se muestra la espera, no la pantalla de
  // activar: antes se alcanzaba a ver un instante el plan y la tarjeta, y quien
  // tocaba algo ahí terminaba en el pago creyendo que era obligatorio.
  if (authLoading || loading || uniendo || (puedeUnirse && !pidio.current)) {
    return (
      <div className="club-splash" aria-busy="true">
        Abriendo el club…
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to={CLUB.entrar}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!activo && esperando) {
    return (
      <div className="club-splash" aria-busy="true">
        Confirmando tu pago…
        <small>Stripe ya cobró. Estamos abriendo tu acceso, toma unos segundos.</small>
      </div>
    );
  }

  return <>{children}</>;
}
