import type { SessionKind, SessionSubject, Skill } from "@/lib/ecos";

type Tone = Skill | "abierta" | "curso";

/**
 * Portada de tarjeta. Si hay imagen, la imagen. Si no, una ficha elegante con
 * la letra de la materia (V · M · O), o la placa de ECOS para la masterclass y
 * los cursos. Misma paleta del sitio.
 */
const ART: Record<Tone, { glyph: string; label: string; hue: string }> = {
  ventas: { glyph: "V", label: "Ventas", hue: "#F0B800" },
  marketing: { glyph: "M", label: "Marketing", hue: "#E9C46A" },
  oratoria: { glyph: "O", label: "Oratoria", hue: "#F5D061" },
  abierta: { glyph: "", label: "Masterclass", hue: "#F0B800" },
  curso: { glyph: "", label: "Curso", hue: "#F0B800" },
};

export function toneFor(subject: SessionSubject | Skill | null | undefined, kind?: SessionKind): Tone {
  if (kind === "masterclass") return "abierta";
  if (subject === "ventas" || subject === "marketing" || subject === "oratoria") return subject;
  return "abierta";
}

export function Cover({ tone, src, title, tag, size = "md" }: { tone: Tone; src?: string | null; title?: string; tag?: string; size?: "sm" | "md" | "lg" }) {
  const a = ART[tone];
  const plate = !src && !a.glyph;
  return (
    <div className={`club-cover ${size} tone-${tone}${plate ? " plate" : ""}`} style={{ ["--hue" as string]: a.hue }}>
      {src ? <img src={src} alt="" loading="lazy" /> : plate ? (
        <span className="club-plate">
          <span className="club-plate-ring" />
          <span className="club-plate-brand">ECOS</span>
          <span className="club-plate-cat">Business Club</span>
          <span className="club-plate-sub">Escuela de Comunicación, Oratoria y Sentido</span>
        </span>
      ) : (
        <span className="club-glyph"><span className="club-glyph-ring" /><span className="club-glyph-letter">{a.glyph}</span><span className="club-glyph-label">{a.label}</span></span>
      )}
      <span className="club-cover-shade" />
      {tag && <span className="club-cover-tag">{tag}</span>}
      {title && <span className="club-cover-title">{title}</span>}
    </div>
  );
}
