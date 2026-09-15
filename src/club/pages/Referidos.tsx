import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubSettings } from "@/lib/club-store";
import { ECOS } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

/**
 * Beneficios del miembro. Dos cosas claras, sin mezclarlas:
 *  - 10% de descuento en los productos de HGG por estar en el club.
 *  - Es embajador de la marca automáticamente: la comisión por lo que compren
 *    las personas que traiga se gestiona en Network (Delega Work), no aquí.
 * Aparte, el enlace para invitar al club (da XP).
 */
export default function Referidos() {
  const { member, progress } = useClub();
  const { settings } = useClubSettings();
  const [copied, setCopied] = useState(false);
  const code = member?.referral_code ?? "";
  const link = `${window.location.origin}${CLUB.landing}?ref=${code}`;

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* copiar a mano */ }
  }

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Por ser del club</p>
        <h1>Tus beneficios</h1>
      </header>

      <section className="club-rules two">
        <div className="club-rule">
          <span className="club-rule-num">{ECOS.descuentoMiembroPct}%</span>
          <h3>de descuento en todo HGG</h3>
          <p>Programa Sentido, Marca con Huella, web, DelegaWork 360 y los cursos. Mientras tu membresía esté activa. Tu código de miembro es tu descuento: <strong>{code || "—"}</strong>.</p>
        </div>
        <div className="club-rule">
          <span className="club-rule-num">✦</span>
          <h3>Eres embajador de la marca</h3>
          <p>Automáticamente, sin trámite. Si recomiendas a alguien un producto de Holman Global Group y lo compra, tu comisión se gestiona desde tu panel de embajador.</p>
          {settings.network_url ? (
            <a className="club-btn small ghost" href={settings.network_url} target="_blank" rel="noopener noreferrer">Ir a mi panel de embajador</a>
          ) : <span className="club-muted">El acceso a tu panel de embajador se publica pronto.</span>}
        </div>
      </section>

      <section className="club-reflink">
        <label htmlFor="reflink">Invita a alguien al club</label>
        <div className="club-reflink-row">
          <input id="reflink" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="club-btn small" onClick={copy}>{copied ? "Copiado" : "Copiar"}</button>
        </div>
        <p className="club-muted">Cada persona que entra por tu enlace y se queda te da +{ECOS.xp.referido} XP en las tres habilidades. Has traído a {progress.referrals_total}; {progress.referrals_active} siguen activas.</p>
      </section>
    </div>
  );
}
