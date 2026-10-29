import { useEffect, useState } from "react";
import { diaLargo, horaCorta, nombreZona, zonaDelNavegador } from "@/lib/agenda";
import { SITE } from "@/lib/config";
import { proximaMasterclass, type Masterclass } from "@/lib/masterclass";
import { getSupabase } from "@/lib/supabase";

/**
 * «Invita a la masterclass»: el enlace de cada miembro para la próxima
 * masterclass abierta (/masterclass?by=CODIGO) y cuántas personas lleva
 * registradas. Quiénes son se ve en «Tus personas», con el resto. Quien llega por su enlace queda a su nombre, y si compra la
 * oferta de esa noche la comisión es suya. Solo se ve si hay una próxima.
 */
export function InvitaMasterclass({ code }: { code: string }) {
  const [clase, setClase] = useState<Masterclass | null>(null);
  const [invitados, setInvitados] = useState<number | null>(null);
  const [ranking, setRanking] = useState<{ nombre: string; registrados: number; yo: boolean | null }[]>([]);
  const [copiado, setCopiado] = useState(false);
  const zona = zonaDelNavegador();

  useEffect(() => {
    let vivo = true;
    proximaMasterclass().then((c) => { if (vivo) setClase(c); }, () => {});
    getSupabase().rpc("hgg_mis_invitados_masterclass").then(({ data, error }) => {
      if (vivo && !error && typeof data === "number") setInvitados(data);
    }, () => {});
    getSupabase().rpc("hgg_ranking_masterclass").then(({ data, error }) => {
      if (vivo && !error && Array.isArray(data)) setRanking(data);
    }, () => {});
    return () => { vivo = false; };
  }, []);

  if (!clase || !code) return null;
  const url = `${SITE.url}/masterclass?by=${encodeURIComponent(code)}`;
  const texto = `Te invito a una masterclass gratuita de Holman Orjuela: «${clase.title}», el ${diaLargo(clase.starts_at, zona)} a las ${horaCorta(clase.starts_at, zona)} (hora de ${nombreZona(zona)}). Regístrate aquí 👉 ${url}`;

  return (
    <section className="proc-meta inv-mc">
      <span className="proc-label">Invita a la masterclass</span>
      <p className="proc-meta-texto">{clase.title}</p>
      <span className="proc-meta-fecha">{diaLargo(clase.starts_at, zona)} · {horaCorta(clase.starts_at, zona)} (hora de {nombreZona(zona)})</span>
      <p className="club-muted">
        Invita a todas las personas a las que les pueda servir. Quien se registra con tu enlace queda a tu nombre:
        si esa noche toma la oferta, la comisión es tuya.
        {invitados !== null && <> Llevas <strong>{invitados}</strong> {invitados === 1 ? "persona registrada" : "personas registradas"}.</>}
      </p>
      <code className="inv-mc-url">{url}</code>
      <div className="inv-mc-botones">
        <button type="button" className="club-btn small" onClick={() => {
          navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); }, () => {});
        }}>{copiado ? "Copiado" : "Copiar mi enlace"}</button>
        <a className="club-btn small ghost" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">Invitar por WhatsApp</a>
      </div>
      {ranking.length > 1 && (
        <div className="inv-mc-ranking">
          <span className="proc-label">Ranking del equipo · premio para quien lleve más</span>
          <ol>
            {ranking.map((r, i) => (
              <li key={`${r.nombre}-${i}`} className={r.yo ? "is-yo" : ""}>
                <span className="inv-mc-pos">{i + 1}</span>
                <span className="inv-mc-nombre">{r.yo ? `${r.nombre} (tú)` : r.nombre}</span>
                <span className="inv-mc-n">{r.registrados}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
