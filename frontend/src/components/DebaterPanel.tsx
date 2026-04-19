import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { updateTurn } from "../lib/api";
import { useStore } from "../lib/store";
import { playTTS, stopTTS, useTTSState } from "../lib/tts";
import type { Side, Verdict } from "../lib/types";

interface Props {
  side: Side;
  teamName: string;
  /** True if this panel is the current focus (speaking live OR the turn being viewed). */
  focused: boolean;
  /** Current speaker label, e.g. "P1" or "O-Final". */
  speaker?: string;
  /** Phase label, e.g. "P1 · Ouverture". */
  label?: string;
  /** The text to render in the body. */
  text: string;
  /** True while streaming — shows the writing dots. */
  streaming?: boolean;
  /** True while the reviewer is looking at the draft. */
  reviewing?: boolean;
  /** Reviewer verdict from the last turn — null to hide. */
  verdict?: Verdict | null;
  /** Active POI interruption (either incoming or outgoing). */
  poi?: { side: Side; text: string } | null;
  /** No moderator controls / no verdict chip. */
  readOnly?: boolean;
  /** If false, no focus ring, text is smaller (context view). */
  dimmed?: boolean;
  /** Backing transcript index for this focused speech — enables editing. */
  turnIndex?: number | null;
}

const SIDE_LABEL: Record<Side, string> = {
  proposition: "pour la motion",
  opposition: "contre la motion",
};

const MONOGRAMS: Record<Side, string> = {
  proposition: "Pro.",
  opposition: "Con.",
};

export function DebaterPanel({
  side, teamName, focused, speaker, label, text, streaming, reviewing, verdict, poi, readOnly, dimmed, turnIndex,
}: Props) {
  const isPro = side === "proposition";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [text, poi]);

  const ttsState = useTTSState();
  const isSpeaking = ttsState?.side === side;
  const ttsLoading = isSpeaking && ttsState?.status === "loading";
  const canSpeak = text.length > 20;

  const showingPoi = poi && poi.side !== side;
  const poiFromThisSide = poi && poi.side === side;

  // ---- Edit mode -----------------------------------------------------------
  const { debateId, patchTurnText } = useStore();
  const canEdit =
    !readOnly && focused && !streaming && !reviewing && typeof turnIndex === "number" && turnIndex >= 0 && !!text;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  // Exit edit mode whenever the focused turn changes.
  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSaving(false);
  }, [turnIndex, side, focused]);

  async function saveEdit() {
    if (!debateId || typeof turnIndex !== "number") return;
    const next = draft.trim();
    if (!next) return;
    setSaving(true);
    try {
      await updateTurn(debateId, turnIndex, next);
      patchTurnText(turnIndex, next);
      stopTTS();
      setEditing(false);
    } catch (e: any) {
      alert("Échec de la sauvegarde : " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      layout
      className={`relative flex-1 flex flex-col surface-soft ${
        isPro ? "surface-pro" : "surface-con"
      } overflow-hidden grain`}
      animate={{
        boxShadow: focused && !dimmed
          ? isPro
            ? "0 0 80px -20px rgba(168,172,178,0.55)"
            : "0 0 80px -20px rgba(179,172,158,0.55)"
          : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        className={`absolute -top-20 ${isPro ? "-left-20" : "-right-20"} w-64 h-64 rounded-full blur-3xl`}
        style={{
          background: isPro
            ? "radial-gradient(circle, rgba(168,172,178,0.45), transparent 62%)"
            : "radial-gradient(circle, rgba(179,172,158,0.45), transparent 62%)",
        }}
        animate={{ opacity: focused && !dimmed ? 0.6 : 0.2 }}
        transition={{ duration: 0.8 }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 p-3 border-b border-[#1f1f24]">
        <div
          className={`w-10 h-10 flex items-center justify-center font-display italic text-base ${
            isPro ? "text-pro-300" : "text-con-300"
          }`}
          style={{ border: "1px solid rgba(244,241,232,0.1)" }}
        >
          {MONOGRAMS[side]}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`chip ${isPro ? "chip-pro" : "chip-con"} text-[10px] py-[2px]`}>
            {SIDE_LABEL[side]}
          </span>
          <div className="font-display text-xl leading-tight mt-0.5 truncate">{teamName}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display italic text-[13px] text-bone">
            {speaker ?? "—"}
          </div>
          <div className="text-[10px] text-faint mt-0.5 font-display italic">
            {label ?? (focused ? "prise de parole" : "pas encore pris la parole")}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-0 overflow-y-auto px-5 py-4 font-speech text-bone/95 ${
          dimmed ? "text-[11px] leading-[1.55]" : "text-[15px] leading-[1.65]"
        }`}
      >
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input w-full h-full min-h-[240px] font-speech text-[14px] leading-[1.7] resize-none"
            style={{ background: "#0c0c10", borderColor: "rgba(217,201,143,0.5)" }}
          />
        ) : !text ? (
          <div className="text-faint italic font-display text-base">
            {focused ? "Prise de parole…" : "En attente de leur tour."}
          </div>
        ) : (
          <div className={`whitespace-pre-wrap ${dimmed ? "opacity-60" : ""}`}>
            {formatCEEL(text)}
            {streaming && (
              <span className="writing-dots" aria-hidden>
                <span></span><span></span><span></span>
              </span>
            )}
          </div>
        )}

        <AnimatePresence>
          {showingPoi && poi && poi.text && (
            <motion.div
              key="poi-incoming"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-5 p-4 border ${
                poi.side === "proposition"
                  ? "border-pro-500/50 bg-pro-500/5"
                  : "border-con-500/50 bg-con-500/5"
              }`}
            >
              <span className="chip chip-accent mb-2">
                point d&rsquo;information &middot; {poi.side === "proposition" ? "proposition" : "opposition"}
              </span>
              <div className="font-speech italic text-[14px] mt-1">{poi.text}</div>
            </motion.div>
          )}
          {poiFromThisSide && poi && poi.text && (
            <motion.div
              key="poi-self"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`mt-5 p-4 border ${
                isPro ? "border-pro-500/60" : "border-con-500/60"
              }`}
              style={{ background: "rgba(244,241,232,0.03)" }}
            >
              <span className="chip chip-accent mb-2">notre interruption</span>
              <div className="font-speech italic text-[14px] mt-1">{poi.text}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative px-4 py-2 border-t border-[#1f1f24] flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 text-muted min-w-0">
          <StatusDot streaming={!!streaming} reviewing={!!reviewing} speaking={isSpeaking && !ttsLoading} loading={ttsLoading} focused={focused} />
          <span className="font-display italic truncate">
            {ttsLoading
              ? "synthèse de la voix…"
              : isSpeaking
              ? "lecture en cours"
              : streaming
              ? "en train de parler"
              : reviewing
              ? "en relecture"
              : focused && text
              ? "terminé"
              : "au repos"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {verdict && !readOnly && !editing && (
            <span className={`chip ${verdict === "moderator_edit" ? "chip-accent" : verdict === "accept" ? "chip-accent" : "chip-con"}`}>
              {verdict === "moderator_edit" ? "édité" : verdict === "accept" ? "validé" : "révisé"}
            </span>
          )}

          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setDraft(""); }}
                disabled={saving}
                className="btn text-[10px] px-2.5 py-1 font-display italic"
              >
                annuler
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={saveEdit}
                disabled={saving || draft.trim().length < 10}
                className="btn btn-primary text-[10px] px-3 py-1 font-display uppercase tracking-[0.1em]"
              >
                {saving ? "…" : "valider"}
              </motion.button>
            </>
          ) : (
            <>
              {canEdit && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setDraft(text); setEditing(true); }}
                  className="btn text-[10px] px-2.5 py-1 font-display italic"
                  title="modifier ce discours"
                >
                  ✎ éditer
                </motion.button>
              )}
              <SpeakButton
                isSpeaking={isSpeaking}
                loading={ttsLoading}
                canSpeak={canSpeak}
                onClick={() => (isSpeaking ? stopTTS() : playTTS(side, text))}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SpeakButton({
  isSpeaking, loading, canSpeak, onClick,
}: {
  isSpeaking: boolean; loading: boolean; canSpeak: boolean; onClick: () => void;
}) {
  // Optimistic flash: show spinner instantly on click, even before the TTS
  // state update lands. Clears after 800ms if nothing took over.
  const [justClicked, setJustClicked] = useState(false);
  useEffect(() => {
    if (!justClicked) return;
    const id = setTimeout(() => setJustClicked(false), 800);
    return () => clearTimeout(id);
  }, [justClicked]);

  const showSpinner = loading || (justClicked && !isSpeaking);
  const active = isSpeaking || justClicked;

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        if (!canSpeak && !active) return;
        setJustClicked(true);
        onClick();
      }}
      disabled={!canSpeak && !active}
      className="btn text-[10px] px-2.5 py-1 font-display italic inline-flex items-center gap-1.5 min-w-[78px] justify-center"
      title={canSpeak ? (isSpeaking ? "arrêter la lecture" : "lire à voix haute") : "rien à lire pour l'instant"}
      style={active ? { borderColor: "rgba(217,201,143,0.6)", color: "#d9c98f", background: "rgba(217,201,143,0.08)" } : undefined}
    >
      {showSpinner ? (
        <>
          <motion.span
            aria-hidden
            className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <span>synthèse…</span>
        </>
      ) : isSpeaking ? (
        <>
          <motion.span
            aria-hidden
            className="inline-block w-2 h-2 bg-current rounded-full"
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <span>stop</span>
        </>
      ) : (
        <>
          <span aria-hidden>▸</span>
          <span>écouter</span>
        </>
      )}
    </motion.button>
  );
}

function formatCEEL(text: string) {
  const parts = text.split(
    /(\*\*Claim:\*\*|\*\*Explanation:\*\*|\*\*Evidence:\*\*|\*\*Link:\*\*|\*\*Thèse ?:\*\*|\*\*Explication ?:\*\*|\*\*Preuve ?:\*\*|\*\*Lien ?:\*\*)/g
  );
  const LABEL_FR: Record<string, string> = {
    Claim: "thèse",
    Explanation: "explication",
    Evidence: "preuve",
    Link: "lien",
    Thèse: "thèse",
    Explication: "explication",
    Preuve: "preuve",
    Lien: "lien",
  };
  return parts.map((p, i) => {
    const m = p.match(/^\*\*(Claim|Explanation|Evidence|Link|Thèse|Explication|Preuve|Lien) ?:\*\*$/);
    if (m) {
      const lbl = LABEL_FR[m[1]] ?? m[1].toLowerCase();
      return (
        <strong
          key={i}
          className="text-accent font-display italic font-normal block mt-4 mb-0.5 text-[11px] tracking-[0.1em] uppercase"
        >
          — {lbl}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function StatusDot({
  streaming, reviewing, speaking, loading, focused,
}: {
  streaming: boolean; reviewing: boolean; speaking: boolean; loading: boolean; focused: boolean;
}) {
  if (loading)   return <span className="w-1.5 h-1.5 bg-accent animate-pulse" />;
  if (speaking)  return <motion.span className="w-1.5 h-1.5 bg-accent" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />;
  if (streaming) return <motion.span className="w-1.5 h-1.5 bg-bone" animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />;
  if (reviewing) return <span className="w-1.5 h-1.5 bg-accent animate-pulse" />;
  if (focused)   return <span className="w-1.5 h-1.5 bg-bone/80" />;
  return <span className="w-1.5 h-1.5 bg-dim" />;
}
