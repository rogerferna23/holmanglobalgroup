import { useEffect, useState } from "react";
import { useEcosSettings } from "@/lib/ecos-admin-store";

const FIELDS: { key: string; label: string; hint?: string; multiline?: boolean; soloLectura?: boolean }[] = [
  { key: "zoom_url", label: "Enlace de Zoom general", hint: "Se usa en toda sesión que no tenga el suyo. Vive detrás del login: nunca se manda por correo." },
  { key: "zoom_passcode", label: "Código de la reunión", hint: "Cámbialo el día 1 de cada mes." },
  { key: "horario", label: "Horario", hint: "Se muestra en el panel del miembro." },
  { key: "whatsapp_group_url", label: "Enlace al grupo de WhatsApp", hint: "El botón «Entrar al grupo» del panel apunta aquí." },
  { key: "bunny_library_id", label: "Id de la biblioteca de Bunny Stream", hint: "Un número. Con él se incrustan los videos dentro del panel." },
  { key: "founder_cap", label: "Cupo de fundadores", hint: "Cuántas personas reciben el mes gratis. Es lo que muestra el contador de la página y lo que decide quién entra como fundador." },
  // Solo lectura: la fecha también está escrita en la landing, el registro, el
  // aviso del panel y los correos. Si se cambiara solo aquí, Stripe cobraría en
  // una fecha y el sitio prometería otra. Se cambia en código, todo junto.
  { key: "trial_end", label: "Fin del mes gratis", soloLectura: true, hint: "Momento exacto del primer cobro, igual para todos. No se cambia desde aquí: la misma fecha está en la página, el registro y el panel, y tienen que decir lo mismo. Si hay que moverla, pídeselo a Jarvis." },
];

export function EcosAjustes() {
  const { data: rows, save, loading } = useEcosSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const r of rows) v[r.key] = r.value;
    setValues(v);
  }, [rows]);

  async function saveKey(key: string) {
    setSaving(key);
    setMsg(null);
    const err = await save(key, values[key] ?? "");
    setSaving(null);
    setMsg(err ? err : "Guardado.");
  }

  return (
    <div className="adm-card adm-card-pad adm-ecos-settings">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Ajustes del club</h2></div>
        <span className="adm-card-sub">{loading ? "Cargando…" : msg ?? ""}</span>
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="adm-field">
          <label htmlFor={`cfg-${f.key}`}>{f.label}</label>
          <div className="adm-ecos-setting-row">
            {f.multiline ? (
              <textarea id={`cfg-${f.key}`} rows={2} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : (
              <input id={`cfg-${f.key}`} type="text" value={values[f.key] ?? ""} readOnly={f.soloLectura} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            )}
            {!f.soloLectura && (
              <button type="button" className="adm-add-btn" disabled={saving === f.key} onClick={() => saveKey(f.key)}>
                {saving === f.key ? "…" : "Guardar"}
              </button>
            )}
          </div>
          {f.hint && <span className="adm-ecos-sub">{f.hint}</span>}
        </div>
      ))}
    </div>
  );
}
