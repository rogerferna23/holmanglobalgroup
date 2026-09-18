import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { CLUB } from "@/lib/routes";
import { MembresiaInactiva } from "@/club/MembresiaInactiva";

/** Segundos que se espera al webhook antes de darse por vencido. */
const ESPERA_MAX = 40_000;
const CADA = 2_000;

/**
 * Puerta del panel de miembros. Exige sesión y membresía ACTIVA.
 *
 * Es deliberadamente distinta de ProtectedRoute (la del admin): aquí no se
 * mira el rol, se mira `ecos_members.status`, que solo escribe el webhook de
 * Stripe. Quien cancela pierde el acceso solo; quien paga lo recupera solo.
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
  const activo = member?.status === "activo";
  const [esperando, setEsperando] = useState(vienePago);
  const desde = useRef(Date.now());

  useEffect(() => {
    if (!esperando || activo || authLoading || !session) return;
    const t = setInterval(() => {
      if (Date.now() - desde.current > ESPERA_MAX) { setEsperando(false); return; }
      void refresh();
    }, CADA);
    return () => clearInterval(t);
  }, [esperando, activo, authLoading, session, refresh]);

  useEffect(() => { if (activo) setEsperando(false); }, [activo]);

  if (authLoading || loading) {
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

  if (!activo) return <MembresiaInactiva member={member} />;

  return <>{children}</>;
}
