import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMisReferidos } from "@/lib/club-store";

/**
 * Aviso en Inicio: «Laura G. entró al club con tu enlace». Se muestra a quien
 * trajo a alguien desde la última vez que lo cerró o que abrió Comisiones.
 *
 * La marca de «ya lo vi» vive en el navegador: es una ayuda para el miembro,
 * no un dato que importe al servidor. Sin marca, cuentan las últimas 2 semanas.
 */
const DIAS_SIN_MARCA = 14;

function clave(memberId: string) {
  return `ecos-referidos-visto:${memberId}`;
}

function leerVisto(memberId: string): number {
  try {
    const v = Number(localStorage.getItem(clave(memberId)));
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    /* sin almacenamiento: se usa la ventana por defecto */
  }
  return Date.now() - DIAS_SIN_MARCA * 86_400_000;
}

/** Marca como vistos los referidos hasta ahora (al cerrar el aviso o abrir Comisiones). */
export function marcarReferidosVistos(memberId: string | null | undefined) {
  if (!memberId) return;
  try {
    localStorage.setItem(clave(memberId), String(Date.now()));
  } catch {
    /* sin almacenamiento, el aviso vuelve a salir la próxima vez */
  }
}

export function AvisoReferidos({ memberId }: { memberId: string | null | undefined }) {
  const { referidos } = useMisReferidos();
  const [visto, setVisto] = useState(() => (memberId ? leerVisto(memberId) : Date.now()));

  useEffect(() => {
    if (memberId) setVisto(leerVisto(memberId));
  }, [memberId]);

  const nuevos = referidos.filter((r) => new Date(r.desde).getTime() > visto);
  if (!memberId || nuevos.length === 0) return null;

  const nombres = nuevos.map((r) => r.nombre);
  const texto =
    nombres.length === 1
      ? `${nombres[0]} entró al club con tu enlace.`
      : nombres.length === 2
        ? `${nombres[0]} y ${nombres[1]} entraron al club con tu enlace.`
        : `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más entraron al club con tu enlace.`;
  const enPrueba = nuevos.some((r) => r.estado === "prueba");

  function cerrar() {
    marcarReferidosVistos(memberId);
    setVisto(Date.now());
  }

  return (
    <div className="club-toast club-aviso-ref" role="status">
      <span>
        <strong>{texto}</strong>{" "}
        {enPrueba ? "Está en su prueba gratis: escríbele para darle la bienvenida y acompañarla en su primera clase." : "Ya cuenta en tus comisiones."}{" "}
        <Link to="negocio" onClick={cerrar}>Ver a quién trajiste</Link>
      </span>
      <button type="button" aria-label="Cerrar" onClick={cerrar}>×</button>
    </div>
  );
}
