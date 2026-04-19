import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { postScore } from "../lib/api";
import { useStore } from "../lib/store";
import type { Scores } from "../lib/types";

const CRITERIA: { key: keyof Scores; title: string; subtitle: string }[] = [
  { key: "content",    title: "Contenu",    subtitle: "arguments · recherche" },
  { key: "refutation", title: "Réfutation", subtitle: "écoute · réponse" },
  { key: "structure",  title: "Structure",  subtitle: "clarté · cohérence" },
  { key: "style",      title: "Style",      subtitle: "voix · élocution" },
];

function bandLabel(total: number): { band: string; color: string } {
  if (total <= 65) return { band: "manquement au code", color: "text-red-300" };
  if (total <= 69) return { band: "sous la moyenne", color: "text-muted" };
  if (total <= 73) return { band: "moyen", color: "text-muted" };
  if (total <= 77) return { band: "au-dessus de la moyenne", color: "text-bone" };
  if (total <= 81) return { band: "solide", color: "text-bone" };
  return { band: "magistral", color: "text-accent" };
}

interface Props {
  readOnly?: boolean;
}

export function EvaluationPanel({ readOnly }: Props = {}) {
  const {
    debate, debateId, currentPhase, currentIndex, aiScores, reviewerNotes,
    verdict, turnStatus, transcript, moderatorScores, viewingIndex, pushModeratorScore,
  } = useStore();

  const [scores, setScores] = useState<Scores>({ content: 18, refutation: 18, structure: 18, style: 18 });
  const [note, setNote] = useState("");
  const [lastSavedIndex, setLastSavedIndex] = useState(-1);

  useEffect(() => {
    if (aiScores && turnStatus === "done") {
      setScores(aiScores);
      setNote(reviewerNotes?.slice(0, 200) || "");
    }
  }, [aiScores, turnStatus, reviewerNotes]);

  useEffect(() => { setNote(""); }, [currentIndex]);

  const displayTotal = useMemo(() => {
    const sum = scores.content + scores.refutation + scores.structure + scores.style;
    return Math.round(65 + (sum / 100) * 20);
  }, [scores]);

  const band = bandLabel(displayTotal);
  const canSave = Boolean(debateId) && turnStatus === "done" && lastSavedIndex !== currentIndex && !readOnly;

  async function save() {
    if (!debateId || !currentPhase) return;
    const payload = {
      turn_index: currentIndex,
      speaker: currentPhase.speaker,
      ...scores,
      note,
    };
    await postScore(debateId, payload);
    pushModeratorScore({ ...payload, timestamp: Date.now() });
    setLastSavedIndex(currentIndex);
  }

  const viewedScore = useMemo(() => {
    const idx = viewingIndex ?? (readOnly ? 0 : null);
    if (idx === null) return null;
    return moderatorScores.find((s) => s.turn_index === idx) ?? null;
  }, [viewingIndex, readOnly, moderatorScores]);

  const viewTotal = viewedScore
    ? Math.round(65 + ((viewedScore.content + viewedScore.refutation + viewedScore.structure + viewedScore.style) / 100) * 20)
    : null;
  const viewBand = viewTotal !== null ? bandLabel(viewTotal) : null;

  return (
    <div className="surface-soft grain relative flex flex-col h-full min-h-0 overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 flex items-start justify-between gap-3 px-4 pt-3 pb-3">
        <div className="min-w-0">
          <span className="chip chip-accent mb-1.5">
            {readOnly ? "feuille archivée" : "votre feuille de jugement"}
          </span>
          <div className="font-display italic text-[12px] text-muted truncate">
            {currentPhase ? <>sur {currentPhase.label}</> : "en attente du premier orateur"}
          </div>
        </div>
        <motion.div
          key={viewTotal ?? displayTotal}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-right shrink-0"
        >
          <div className="font-display text-4xl hero-title numeral leading-none">
            {viewTotal ?? displayTotal}
          </div>
          <div className={`text-[10px] mt-0.5 font-display italic uppercase tracking-[0.08em] ${(viewBand ?? band).color}`}>
            {(viewBand ?? band).band}
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 rule" />

      {/* Single scrollable body — nothing can overflow the card. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        {readOnly && !viewedScore ? (
          <div className="font-speech italic text-[13px] text-muted">
            Ce tour n&rsquo;a pas été noté par le modérateur.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {CRITERIA.map((c) => (
              <CriterionSlider
                key={c.key}
                title={c.title}
                subtitle={c.subtitle}
                value={viewedScore ? (viewedScore as any)[c.key] : scores[c.key]}
                aiValue={!readOnly ? aiScores?.[c.key] : undefined}
                onChange={(v) => setScores({ ...scores, [c.key]: v })}
                disabled={readOnly}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <>
            <div className="rule" />
            <div className="flex gap-2 items-stretch">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="quelques mots — ce qui a marqué, ce qui a manqué…"
                rows={2}
                className="input font-speech text-[12px] italic leading-snug flex-1 resize-none"
              />
              <motion.button
                whileHover={{ scale: canSave ? 1.02 : 1 }}
                whileTap={{ scale: canSave ? 0.98 : 1 }}
                disabled={!canSave}
                onClick={save}
                className="btn btn-primary font-display uppercase tracking-[0.1em] text-[11px] px-4 whitespace-nowrap"
              >
                {lastSavedIndex === currentIndex ? "enregistré" : "noter"}
              </motion.button>
            </div>
            {verdict && (
              <span className={`chip ${verdict === "accept" ? "chip-accent" : "chip-con"}`}>
                relecteur &middot; {verdict === "accept" ? "validé" : "révisé"}
              </span>
            )}
          </>
        )}

        {readOnly && viewedScore?.note && (
          <>
            <div className="rule" />
            <div className="chip mb-1">note du modérateur</div>
            <div className="font-speech italic text-[13px] leading-relaxed text-bone/90">
              {viewedScore.note}
            </div>
          </>
        )}

        <AnimatePresence>
          {reviewerNotes && turnStatus === "done" && !readOnly && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="rule mb-2" />
              <div className="chip mb-2">note du relecteur</div>
              <div className="font-speech italic text-[12px] leading-relaxed text-muted">
                {reviewerNotes}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Running totals — inline at the bottom of the scroll, not a separate card */}
        <div className="rule" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="chip">moyennes</span>
            <div className="font-display italic text-[11px] text-muted">
              {transcript.length} tour{transcript.length === 1 ? "" : "s"}
            </div>
          </div>
          <RunningTotals />
        </div>
      </div>
    </div>
  );
}

function CriterionSlider({
  title, subtitle, value, aiValue, onChange, disabled,
}: {
  title: string; subtitle: string; value: number; aiValue?: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-[15px] leading-tight">{title}</div>
          <div className="font-display italic text-[10px] text-muted truncate">{subtitle}</div>
        </div>
        <div className="flex items-baseline gap-1.5 font-display numeral shrink-0">
          {aiValue !== undefined && (
            <span className="italic text-[10px] text-faint">{aiValue}</span>
          )}
          <span className="text-xl">{value}</span>
          <span className="text-faint text-[10px]">/25</span>
        </div>
      </div>
      <div className="mt-1.5 relative">
        <div className="slider-fill" style={{ width: `${(value / 25) * 100}%` }} />
        <input
          type="range"
          min={0}
          max={25}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="score relative w-full"
          style={disabled ? { pointerEvents: "none", opacity: 0.85 } : undefined}
        />
      </div>
    </div>
  );
}

function RunningTotals() {
  const { moderatorScores, transcript, debate } = useStore();
  const agg = useMemo(() => {
    const bySide = { proposition: [] as number[], opposition: [] as number[] };
    for (const s of moderatorScores) {
      const turn = transcript.find((t) => t.index === s.turn_index);
      const side = turn?.side;
      const sum = s.content + s.refutation + s.structure + s.style;
      const mapped = 65 + (sum / 100) * 20;
      if (side === "proposition") bySide.proposition.push(mapped);
      else if (side === "opposition") bySide.opposition.push(mapped);
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return {
      pro: mean(bySide.proposition),
      con: mean(bySide.opposition),
      pn: bySide.proposition.length,
      cn: bySide.opposition.length,
    };
  }, [moderatorScores, transcript]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <SideCard title={debate?.pro_team_name || "Proposition"} mean={agg.pro} n={agg.pn} tint="pro" />
      <SideCard title={debate?.con_team_name || "Opposition"} mean={agg.con} n={agg.cn} tint="con" />
    </div>
  );
}

function SideCard({ title, mean, n, tint }: { title: string; mean: number | null; n: number; tint: "pro" | "con" }) {
  return (
    <div
      className="px-3 py-2 border flex items-baseline justify-between gap-2"
      style={{
        borderColor: tint === "pro" ? "rgba(168,172,178,0.3)" : "rgba(179,172,158,0.3)",
        background: "rgba(244,241,232,0.02)",
      }}
    >
      <div className="min-w-0">
        <div className={`font-display italic text-[11px] uppercase tracking-[0.08em] truncate ${tint === "pro" ? "text-pro-300" : "text-con-300"}`}>
          {title}
        </div>
        <div className="font-display italic text-[10px] text-faint">
          {n} tour{n === 1 ? "" : "s"}
        </div>
      </div>
      <div className="font-display text-2xl numeral shrink-0">
        {mean !== null ? mean.toFixed(1) : "—"}
      </div>
    </div>
  );
}
