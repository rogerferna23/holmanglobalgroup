import { useMemo, useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { SITE } from "@/lib/config";
import { ECOS, usd, type EcosLibraryItem } from "@/lib/ecos";
import { useClubCatalog, useClubLibrary } from "@/lib/club-store";
import { VideoCard } from "@/club/VideoCard";
import { Cover } from "@/club/Cover";

/**
 * Los cursos de Holman. Cada uno tiene precio; el acceso lo da Holman a mano
 * o cuando la persona lo compra. Sin precio = incluido para todos los miembros.
 */
export default function Cursos() {
  const { member } = useClub();
  const { catalog, loading } = useClubCatalog();
  const { items: unlocked } = useClubLibrary();
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const unlockedById = useMemo(() => new Map(unlocked.map((u) => [u.id, u])), [unlocked]);
  const courses = useMemo(() => catalog.filter((c) => c.kind === "curso" && !c.parent_id), [catalog]);
  const lessonsOf = (id: string) => catalog.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const opened = openCourse ? courses.find((c) => c.id === openCourse) : null;
  const mine = courses.filter((c) => c.has_access);
  const others = courses.filter((c) => !c.has_access);

  const askFor = (title: string) =>
    `https://wa.me/${SITE.whatsapp.e164}?text=${encodeURIComponent(`Hola, soy ${member?.name ?? "miembro de ECOS"} (código ${member?.referral_code ?? ""}). Quiero el curso «${title}» con mi ${ECOS.descuentoMiembroPct}% de miembro.`)}`;

  if (opened) {
    const lessons = lessonsOf(opened.id);
    const full = unlockedById.get(opened.id);
    return (
      <div className="club-page">
        <button type="button" className="club-link" onClick={() => setOpenCourse(null)}>← Cursos</button>
        <header className="club-page-head">
          <p className="club-eyebrow">Curso</p>
          <h1>{opened.title}</h1>
          {opened.description && <p className="club-page-sub">{opened.description}</p>}
        </header>
        <ul className="club-vgrid">
          {lessons.length > 0
            ? lessons.map((l) => { const fl = unlockedById.get(l.id); return fl ? <VideoCard key={l.id} item={fl} /> : <li key={l.id} className="club-muted">{l.title}</li>; })
            : full ? <VideoCard item={full as EcosLibraryItem} wide /> : null}
        </ul>
      </div>
    );
  }

  const Card = ({ c }: { c: (typeof courses)[number] }) => {
    const n = lessonsOf(c.id).length;
    const free = !c.price_usd;
    return (
      <div className="club-tile-card">
        <button type="button" className="club-tile-card-btn" disabled={!c.has_access} onClick={() => c.has_access && setOpenCourse(c.id)} aria-label={c.title}>
          <Cover tone="curso" src={c.cover_url} tag={c.has_access ? (n ? `${n} lecciones` : "Curso") : free ? "Incluido" : usd(Number(c.price_usd))} />
        </button>
        <span className="club-tile-card-title">{c.title}</span>
        {c.description && <span className="club-tile-card-meta">{c.description}</span>}
        {!c.has_access && !free && (
          <a className="club-link" href={askFor(c.title)} target="_blank" rel="noopener noreferrer">
            Quiero este curso · {usd(Number(c.price_usd) * (1 - ECOS.descuentoMiembroPct / 100))} con tu {ECOS.descuentoMiembroPct}%
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Los cursos de Holman</p>
        <h1>Cursos</h1>
        <p className="club-page-sub">Como miembro de ECOS tienes {ECOS.descuentoMiembroPct}% de descuento en todos los productos de HGG.</p>
      </header>
      {loading ? <p className="club-muted">Cargando…</p> : courses.length === 0 ? <p className="club-muted">Los cursos se están cargando.</p> : (
        <>
          {mine.length > 0 && (<><section className="club-row-head"><h2>Tus cursos</h2></section><section className="club-row">{mine.map((c) => <Card key={c.id} c={c} />)}</section></>)}
          {others.length > 0 && (<><section className="club-row-head"><h2>{mine.length ? "Más cursos" : "Cursos disponibles"}</h2></section><section className="club-row">{others.map((c) => <Card key={c.id} c={c} />)}</section></>)}
        </>
      )}
    </div>
  );
}
