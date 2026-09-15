import { useClubLibrary } from "@/lib/club-store";
import { VideoCard } from "@/club/VideoCard";

export default function Grabaciones() {
  const { items, loading } = useClubLibrary("grabacion");
  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Biblioteca viva</p>
        <h1>Grabaciones</h1>
      </header>
      {loading ? <p className="club-muted">Cargando…</p> : items.length === 0 ? <p className="club-muted">Las grabaciones aparecen aquí después de cada clase.</p> : (
        <ul className="club-vgrid">{[...items].reverse().map((it) => <VideoCard key={it.id} item={it} />)}</ul>
      )}
    </div>
  );
}
