import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { bunnyEmbedUrl, ECOS, SUBJECT_LABEL, type EcosLibraryItem } from "@/lib/ecos";
import { useClubSettings } from "@/lib/club-store";
import { Cover, toneFor } from "@/club/Cover";

/** Grabación o lección: portada; al abrir, el video dentro del panel (Bunny). */
export function VideoCard({ item, wide = false }: { item: EcosLibraryItem; wide?: boolean }) {
  const { progress, markViewed } = useClub();
  const { settings } = useClubSettings();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const viewed = progress.viewed.includes(item.id);
  const embed = item.bunny_video_id && settings.bunny_library_id ? bunnyEmbedUrl(settings.bunny_library_id, item.bunny_video_id) : null;

  async function seen() {
    const r = await markViewed(item.id);
    setMsg(r.error ?? (r.points ? `+${r.points} XP` : "Ya estaba marcado"));
  }

  return (
    <li className={`club-vcard${open ? " open" : ""}${wide ? " wide" : ""}`} id={item.id}>
      {open && embed ? (
        <div className="club-video"><iframe src={embed} title={item.title} loading="lazy" allow="accelerometer; gyroscope; encrypted-media; picture-in-picture" allowFullScreen /></div>
      ) : (
        <button type="button" className="club-vcard-cover" onClick={() => (embed ? setOpen(true) : item.url && window.open(item.url, "_blank", "noopener"))} aria-label={`Ver ${item.title}`}>
          <Cover tone={item.kind === "curso" && !item.skill ? "curso" : toneFor(item.skill)} src={item.cover_url} tag={viewed ? "Visto" : item.skill ? SUBJECT_LABEL[item.skill] : undefined} />
          {(embed || item.url) && <span className="club-play">▶</span>}
        </button>
      )}
      <div className="club-vcard-body">
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
        <div className="club-vcard-actions">
          {open && <button type="button" className="club-link" onClick={() => setOpen(false)}>Cerrar</button>}
          {!viewed && (embed || item.url) && <button type="button" className="club-link" onClick={seen}>Marcar visto · +{ECOS.xp.visto} XP</button>}
          {msg && <span className="club-muted">{msg}</span>}
        </div>
      </div>
    </li>
  );
}
