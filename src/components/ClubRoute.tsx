import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { CLUB } from "@/lib/routes";
import { MembresiaInactiva } from "@/club/MembresiaInactiva";

/**
 * Puerta del panel de miembros. Exige sesión y membresía ACTIVA.
 *
 * Es deliberadamente distinta de ProtectedRoute (la del admin): aquí no se
 * mira el rol, se mira `ecos_members.status`, que solo escribe el webhook de
 * Stripe. Quien cancela pierde el acceso solo; quien paga lo recupera solo.
 */
export default function ClubRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { member, loading } = useClub();
  const location = useLocation();

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

  if (!member || member.status !== "activo") {
    return <MembresiaInactiva member={member} />;
  }

  return <>{children}</>;
}
