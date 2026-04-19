import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { openSocket } from "../lib/api";
import { useStore } from "../lib/store";
import { playTTS, stopTTS } from "../lib/tts";
import type { PhaseDef, Side, TranscriptEntry, Verdict } from "../lib/types";
import { DebaterPanel } from "./DebaterPanel";
import { EvaluationPanel } from "./EvaluationPanel";
import { ModeratorConsole, type TagDef } from "./ModeratorConsole";
import { VerdictModal } from "./VerdictModal";

type PanelState = {
  text: string;
  speaker?: string;
  label?: string;
  focused: boolean;
  streaming: boolean;
  reviewing: boolean;
  verdict: Verdict | null;
  /** Index in the transcript for the focused speech (for editing). null if live-streaming or not-yet-spoken. */
  turnIndex: number | null;
};

export function DebateArena() {
  const {
    route,
    debate,
    debateId,
    phases,
    currentPhase,
    currentIndex,
    streamingText,
    reviewedText,
    turnStatus,
    verdict,
    poiActive,
    transcript,
    autoSpeak,
    viewingIndex,
    closeDebate,
    applyServerEvent,
    setViewingIndex,
  } = useStore();

  const isView = route === "view";

  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);

  useEffect(() => {
    if (!debateId || isView) return;
    const ws = openSocket(debateId, applyServerEvent);
    wsRef.current = ws;
    ws.onopen = () => setWsReady(true);
    ws.onclose = () => setWsReady(false);
    return () => { stopTTS(); ws.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, isView]);

  useEffect(() => {
    if (isView || !autoSpeak) return;
    if (turnStatus !== "done") return;
    if (!currentPhase || !reviewedText) return;
    if (currentPhase.phase === "deliberation") return;
    playTTS(currentPhase.side, reviewedText);
  }, [turnStatus, reviewedText, currentPhase, autoSpeak, isView]);

  useEffect(() => {
    if (isView || !autoSpeak || !poiActive || !poiActive.text) return;
    playTTS(poiActive.side, poiActive.text);
  }, [poiActive, autoSpeak, isView]);

  useEffect(() => {
    stopTTS();
  }, [currentPhase?.speaker, currentPhase?.phase, viewingIndex]);

  function send(msg: any) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function findAtIndex(i: number): TranscriptEntry | null {
    return transcript.find((t) => t.index === i) ?? null;
  }
  function findLatestBefore(side: Side, i?: number): TranscriptEntry | null {
    const pool = transcript.filter((t) => t.phase !== "poi" && t.side === side && (i === undefined || t.index <= i));
    return pool.length ? pool[pool.length - 1] : null;
  }

  function resolvePanel(side: Side): PanelState {
    const liveActiveSide: Side | null = currentPhase?.side ?? null;

    // Case A — view mode or navigation index set → render the selected turn.
    if (isView || viewingIndex !== null) {
      const vi = viewingIndex ?? 0;
      const focusTurn = findAtIndex(vi);
      if (focusTurn?.side === side) {
        const phaseDef = phases.find((p) => p.speaker === focusTurn.speaker && p.phase === focusTurn.phase);
        return {
          text: focusTurn.text,
          speaker: focusTurn.speaker,
          label: phaseDef?.label,
          focused: true,
          streaming: false,
          reviewing: false,
          verdict: (focusTurn.verdict ?? null) as any,
          turnIndex: focusTurn.index,
        };
      }
      const prev = findLatestBefore(side, vi);
      return {
        text: prev?.text ?? "",
        speaker: prev?.speaker,
        label: prev ? phases.find((p) => p.speaker === prev.speaker && p.phase === prev.phase)?.label : undefined,
        focused: false,
        streaming: false,
        reviewing: false,
        verdict: null,
        turnIndex: prev ? prev.index : null,
      };
    }

    // Case B — live mode following current.
    if (liveActiveSide === side) {
      return {
        text: turnStatus === "done" ? reviewedText : streamingText,
        speaker: currentPhase?.speaker,
        label: currentPhase?.label,
        focused: true,
        streaming: turnStatus === "streaming",
        reviewing: turnStatus === "reviewing",
        verdict: (verdict ?? null) as any,
        // Only editable once the turn is persisted — i.e. after review.
        turnIndex: turnStatus === "done" ? currentIndex : null,
      };
    }
    // Inactive side — show its last speech, dimmed.
    const prev = findLatestBefore(side);
    return {
      text: prev?.text ?? "",
      speaker: prev?.speaker,
      label: prev ? phases.find((p) => p.speaker === prev.speaker && p.phase === prev.phase)?.label : undefined,
      focused: false,
      streaming: false,
      reviewing: false,
      verdict: null,
      turnIndex: prev ? prev.index : null,
    };
  }

  const proState = resolvePanel("proposition");
  const conState = resolvePanel("opposition");

  const tagClickable: TagDef[] = useMemo(() => {
    return phases.map((p, i) => ({
      phase: p,
      index: i,
      played: i < currentIndex,
      isCurrentLive: !isView && i === currentIndex,
      canClick: isView ? i < currentIndex : i < currentIndex,
    }));
  }, [phases, currentIndex, isView]);

  function clickTag(i: number) {
    if (!tagClickable[i]?.canClick) return;
    setViewingIndex(i);
  }

  const readOnly = isView || viewingIndex !== null;

  return (
    <div className="relative z-10 h-screen w-full overflow-hidden flex flex-col p-4 gap-3">
      {/* Three-column layout on desktop:
          [ Proposition  ·  Logo + Fiche  ·  Opposition ]
          Moderator console spans full width at the bottom.
          On mobile everything stacks. */}
      <div className="flex flex-col md:grid md:grid-cols-12 gap-3 flex-1 min-h-0">

        {/* LEFT · Proposition */}
        <div className="md:col-span-4 flex flex-col min-h-0">
          <DebaterPanel
            side="proposition"
            teamName={debate?.pro_team_name || "Proposition"}
            focused={proState.focused}
            speaker={proState.speaker}
            label={proState.label}
            text={proState.text}
            streaming={proState.streaming}
            reviewing={proState.reviewing}
            verdict={proState.verdict}
            poi={poiActive}
            dimmed={!proState.focused}
            readOnly={readOnly}
            turnIndex={proState.turnIndex}
          />
        </div>

        {/* CENTER · Logo top + Evaluation below (desktop) / logo only on top (mobile) */}
        <div className="md:col-span-4 flex flex-col min-h-0 gap-3 order-first md:order-none">
          <div className="shrink-0 flex flex-col items-center pt-1 pb-1">
            <img
              src="/logo.png"
              alt="La Chambre du Débat"
              className="h-14 md:h-20 w-auto object-contain opacity-95"
              draggable={false}
            />
            <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => { stopTTS(); closeDebate(); }}
                className="chip hover:bg-white/10 cursor-pointer"
              >
                ← retour
              </button>
              <span className="chip chip-accent">{isView ? "rediffusion" : "en direct"}</span>
              {!isView && (
                <span className="font-display italic text-[11px] text-muted">
                  {wsReady ? "live" : "connexion…"}
                </span>
              )}
              {viewingIndex !== null && !isView && (
                <button
                  onClick={() => setViewingIndex(null)}
                  className="chip chip-accent hover:bg-white/10 cursor-pointer"
                >
                  ⟲ au direct
                </button>
              )}
            </div>
            <div className="mt-2 text-center px-2 max-w-xl">
              <div className="font-display italic text-[10px] text-muted uppercase tracking-[0.14em]">la motion</div>
              <div className="font-speech italic text-[14px] leading-snug text-bone/90 line-clamp-2">
                &laquo;&nbsp;{debate?.motion}&nbsp;&raquo;
              </div>
            </div>
          </div>
          {/* Evaluation — fills the center column on desktop, hidden on mobile (use drawer instead) */}
          <div className="flex-1 min-h-0 hidden md:flex md:flex-col w-full">
            <EvaluationPanel readOnly={readOnly} />
          </div>
        </div>

        {/* RIGHT · Opposition */}
        <div className="md:col-span-4 flex flex-col min-h-0">
          <DebaterPanel
            side="opposition"
            teamName={debate?.con_team_name || "Opposition"}
            focused={conState.focused}
            speaker={conState.speaker}
            label={conState.label}
            text={conState.text}
            streaming={conState.streaming}
            reviewing={conState.reviewing}
            verdict={conState.verdict}
            poi={poiActive}
            dimmed={!conState.focused}
            readOnly={readOnly}
            turnIndex={conState.turnIndex}
          />
        </div>

        {/* Mobile evaluation drawer (hidden on md+ because eval is in the center column there) */}
        <MobileEvalDrawer readOnly={readOnly} />
      </div>

      {/* Full-width moderator console */}
      <div className="shrink-0">
        <ModeratorConsole
          isView={isView}
          onNext={() => send({ action: "next" })}
          onPoi={(side, prompt) => send({ action: "poi", side, prompt })}
          onFinalVerdict={() => setVerdictOpen(true)}
          tagClickable={tagClickable}
          onClickTag={clickTag}
          viewingIndex={viewingIndex}
        />
      </div>

      <AnimatePresence>
        {verdictOpen && <VerdictModal open={verdictOpen} onClose={() => setVerdictOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile evaluation drawer — a floating FAB that opens a bottom sheet.
// ---------------------------------------------------------------------------

function MobileEvalDrawer({ readOnly }: { readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Floating toggle — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-30 btn btn-primary text-[12px] font-display uppercase tracking-[0.1em] shadow-2xl"
        style={{ paddingInline: 16, paddingBlock: 10 }}
      >
        ✦ notation
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-end"
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-h-[90vh] surface p-3 flex flex-col min-h-0"
              style={{ borderBottomWidth: 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="chip chip-accent">feuille de jugement</span>
                <button onClick={() => setOpen(false)} className="btn text-[11px]">
                  fermer
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <EvaluationPanel readOnly={readOnly} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
