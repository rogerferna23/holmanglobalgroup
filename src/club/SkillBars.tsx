import { levelOf, levelProgress, ECOS, SKILL_LABEL, SKILLS, type Skill } from "@/lib/ecos";

/** Las tres barras del modo RPG. Cada 100 XP un nivel. */
export function SkillBars({ xp, compact = false }: { xp: Record<Skill, number>; compact?: boolean }) {
  return (
    <div className={`club-skills${compact ? " compact" : ""}`}>
      {SKILLS.map((k) => {
        const lvl = levelOf(xp[k]);
        const pct = levelProgress(xp[k]);
        return (
          <div key={k} className="club-skill">
            <div className="club-skill-head">
              <span className="club-skill-name">{SKILL_LABEL[k]}</span>
              <span className="club-skill-level">Nivel {lvl}</span>
            </div>
            <div className="club-skill-bar" role="progressbar" aria-valuemin={0} aria-valuemax={ECOS.xp.porNivel} aria-valuenow={pct} aria-label={`${SKILL_LABEL[k]}: ${pct} de ${ECOS.xp.porNivel} XP para el nivel ${lvl + 1}`}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {!compact && <span className="club-skill-xp">{pct} / {ECOS.xp.porNivel} XP · {xp[k]} en total</span>}
          </div>
        );
      })}
    </div>
  );
}
