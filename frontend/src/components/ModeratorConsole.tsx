import { motion } from "framer-motion";
import { useState } from "react";
import { stopTTS } from "../lib/tts";
import { useStore } from "../lib/store";
import type { PhaseDef, Side } from "../lib/types";

export interface TagDef {
  phase: PhaseDef;
  index: number;
  played: boolean;
  isCurrentLive: boolean;
  canClick: boolean;
}

interface Props {
  isView: boolean;
  onNext: () => void;
  onPoi: (side: Side, prompt: string) => void;
  onFinalVerdict: () => void;
  tagClickable: TagDef[];
  onClickTag: (i: number) => void;
  viewingIndex: number | null;
}

export function ModeratorConsole({
  isView, onNext, onPoi, onFinalVerdict, tagClickable, onClickTag, viewingIndex,
}: Props) {
  const { phases, currentIndex, turnStatus, autoSpeak, setAutoSpeak, audienceQuestion, currentPhase } = useStore();
  const [poiOpen, setPoiOpen] = useState(false);
  const [poiSide, setPoiSide] = useState<Side>("opposition");
  const [poiPrompt, setPoiPrompt] = useState("");

  const atEnd = currentIndex >= phases.length;
  const busy = turnStatus === "streaming" || turnStatus === "reviewing";
  const upcoming = phases[currentIndex];

  return (
    <div className="surface-soft p-4 grain relative">
      <div className="flex items-center justify-between mb-3 gap-6">
        <div className="min-w-0 flex items-center gap-3">
          <span className="chip chip-accent shrink-0">
            {isView ? "rediffusion" : "pupitre du modérateur"}
          </span>
          <div className="font-speech italic text-[13px] text-muted truncate">
            {isView ? (
              <>tour {(viewingIndex ?? 0) + 1} sur {currentIndex}</>
            ) : atEnd
              ? "Tous les discours ont été prononcés — à votre verdict."
              : <>à suivre &middot; <span className="text-bone">{upcoming?.label}</span></>
            }
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display italic text-[12px] text-muted numeral">
            {Math.min(currentIndex, phases.length)} / {phases.length}
          </div>
          <ProgressBar current={currentIndex} total={phases.length} />
        </div>
      </div>

      {audienceQuestion && currentPhase?.phase === "qa_answer" && !isView && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-3 px-3 py-2 border border-accent/30"
          style={{ background: "rgba(217,201,143,0.05)" }}
        >
          <div className="font-display italic text-[10px] text-accent mb-0.5 uppercase tracking-[0.12em]">
            une question du public
          </div>
          <div className="font-speech italic text-[13px] leading-snug">{audienceQuestion}</div>
        </motion.div>
      )}

      {!isView && (
        <div className="flex gap-2 items-center">
          {!atEnd ? (
            <motion.button
              whileHover={{ scale: busy ? 1 : 1.01 }}
              whileTap={{ scale: busy ? 1 : 0.99 }}
              disabled={busy}
              onClick={onNext}
              className="btn btn-primary flex-1 justify-center py-2.5 font-display uppercase tracking-[0.1em] text-[12px]"
            >
              {busy
                ? turnStatus === "streaming"
                  ? "l'orateur a la parole…"
                  : "le relecteur lit…"
                : currentIndex === 0
                ? "Ouvrir le débat"
                : "Orateur suivant"}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onFinalVerdict}
              className="btn btn-primary flex-1 justify-center py-2.5 font-display uppercase tracking-[0.1em] text-[12px]"
            >
              Rendre le verdict
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setPoiOpen(!poiOpen)}
            disabled={busy}
            className="btn font-display italic text-[12px] py-2.5"
          >
            Interrompre
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              const next = !autoSpeak;
              setAutoSpeak(next);
              if (!next) stopTTS();
            }}
            className={`btn font-display italic text-[12px] py-2.5 ${autoSpeak ? "chip-accent" : ""}`}
            style={autoSpeak ? { borderColor: "rgba(217,201,143,0.6)", color: "#d9c98f" } : undefined}
          >
            {autoSpeak ? "◉ voix activée" : "○ voix"}
          </motion.button>
        </div>
      )}

      {poiOpen && !isView && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          className="mt-5 p-5 border border-accent/25"
          style={{ background: "rgba(244,241,232,0.02)" }}
        >
          <div className="font-speech italic text-[13px] text-muted mb-3 leading-relaxed">
            Un Point d&rsquo;Information est une interruption brève et ciblée par
            l&rsquo;équipe adverse. Vous l&rsquo;autorisez au nom de l&rsquo;orateur en cours.
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPoiSide("proposition")}
              className={`btn ${poiSide === "proposition" ? "btn-pro" : ""}`}
            >
              côté proposition
            </button>
            <button
              onClick={() => setPoiSide("opposition")}
              className={`btn ${poiSide === "opposition" ? "btn-con" : ""}`}
            >
              côté opposition
            </button>
          </div>
          <textarea
            value={poiPrompt}
            onChange={(e) => setPoiPrompt(e.target.value)}
            placeholder="Optionnel — cible de l'interruption…"
            rows={2}
            className="input font-speech text-[13px]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn" onClick={() => setPoiOpen(false)}>annuler</button>
            <button
              className="btn btn-primary font-display uppercase tracking-[0.1em]"
              onClick={() => {
                onPoi(poiSide, poiPrompt);
                setPoiOpen(false);
                setPoiPrompt("");
              }}
            >
              Accorder l&rsquo;interruption
            </button>
          </div>
        </motion.div>
      )}

      {/* Phase timeline — tags are clickable when their turn has been played. */}
      <div className="mt-3 flex items-center gap-2">
        <div className="font-display italic text-[10px] text-muted uppercase tracking-[0.12em] shrink-0">
          ordre
        </div>
        <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
          {tagClickable.map((t, i) => {
            const p = t.phase;
            const isViewed = viewingIndex === i;
            const played = t.played;
            const current = t.isCurrentLive;
            return (
              <button
                key={i}
                onClick={() => onClickTag(i)}
                disabled={!t.canClick && !current}
                className="relative h-6 px-2 flex items-center text-[10px] font-display italic shrink-0 transition-colors"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isViewed
                    ? "rgba(217,201,143,0.8)"
                    : current
                    ? "rgba(217,201,143,0.6)"
                    : played
                    ? (p.side === "proposition" ? "rgba(168,172,178,0.5)" : "rgba(179,172,158,0.5)")
                    : "rgba(244,241,232,0.07)",
                  background: isViewed
                    ? "rgba(217,201,143,0.14)"
                    : current
                    ? "rgba(217,201,143,0.1)"
                    : played
                    ? (p.side === "proposition" ? "rgba(168,172,178,0.08)" : "rgba(179,172,158,0.08)")
                    : "transparent",
                  color: isViewed || current ? "#d9c98f" : played ? "#f4f1e8" : "#5a5853",
                  cursor: t.canClick ? "pointer" : "default",
                }}
                title={t.canClick ? "afficher ce tour" : (current ? "en cours" : "pas encore joué")}
              >
                {p.speaker}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mt-2 w-44 h-[1px] bg-dim overflow-hidden">
      <motion.div
        className="h-full bg-bone"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}
