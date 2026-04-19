import { create } from "zustand";
import type { DebateRecord } from "./api";
import type {
  ModeratorScore,
  PhaseDef,
  Scores,
  Side,
  TranscriptEntry,
} from "./types";

type TurnStatus = "idle" | "streaming" | "reviewing" | "done" | "error";
type Route = "auth" | "dashboard" | "setup" | "arena" | "view";

interface Store {
  // Routing & auth
  route: Route;
  username: string | null;

  // Phase sequence (loaded once from backend).
  phases: PhaseDef[];

  // Active debate (in-memory hydration of DebateRecord).
  debateId: string | null;
  debate: DebateRecord | null;

  // Live turn state (WS events).
  currentIndex: number;
  currentPhase: PhaseDef | null;
  streamingText: string;
  reviewedText: string;
  aiScores: Scores | null;
  reviewerNotes: string;
  verdict: "accept" | "revise" | null;
  turnStatus: TurnStatus;
  poiActive: { side: Side; text: string } | null;

  // Persistent data (loaded from DebateRecord and/or WS events).
  transcript: TranscriptEntry[];
  moderatorScores: ModeratorScore[];
  audienceQuestion: string | null;

  /** Index of the turn the user is currently VIEWING (null = live/latest). */
  viewingIndex: number | null;

  autoSpeak: boolean;

  // Setters
  setRoute: (r: Route) => void;
  setUsername: (u: string | null) => void;
  setPhases: (p: PhaseDef[]) => void;
  openDebate: (d: DebateRecord, mode: "arena" | "view") => void;
  closeDebate: () => void;
  applyServerEvent: (evt: any) => void;
  pushModeratorScore: (s: ModeratorScore) => void;
  setAutoSpeak: (v: boolean) => void;
  setViewingIndex: (i: number | null) => void;
  /** Replace a turn's text locally (after the backend PUT succeeds). */
  patchTurnText: (index: number, text: string) => void;
  logout: () => void;
}

function hydrateTranscript(record: DebateRecord): TranscriptEntry[] {
  return (record.transcript ?? []).map((t: any) => ({
    index: t.index,
    side: t.side,
    phase: t.phase,
    speaker: t.speaker,
    text: t.text,
    verdict: t.verdict,
    scores: t.scores,
  }));
}

function hydrateScores(record: DebateRecord): ModeratorScore[] {
  const out: ModeratorScore[] = [];
  for (const arr of Object.values(record.scores ?? {})) {
    for (const s of arr) {
      out.push({
        speaker: s.speaker,
        turn_index: s.turn_index,
        content: s.content,
        refutation: s.refutation,
        structure: s.structure,
        style: s.style,
        note: s.note ?? "",
        timestamp: s.timestamp ?? 0,
      });
    }
  }
  return out;
}

const blankTurnState = {
  currentPhase: null as PhaseDef | null,
  streamingText: "",
  reviewedText: "",
  aiScores: null as Scores | null,
  reviewerNotes: "",
  verdict: null as "accept" | "revise" | null,
  turnStatus: "idle" as TurnStatus,
  poiActive: null as { side: Side; text: string } | null,
  audienceQuestion: null as string | null,
};

export const useStore = create<Store>((set, get) => ({
  route: "auth",
  username: null,
  phases: [],
  debateId: null,
  debate: null,

  currentIndex: 0,
  ...blankTurnState,

  transcript: [],
  moderatorScores: [],

  viewingIndex: null,
  autoSpeak: false,

  setRoute: (r) => set({ route: r }),
  setUsername: (u) => set({ username: u }),
  setPhases: (p) => set({ phases: p }),

  openDebate: (d, mode) => set({
    route: mode,
    debate: d,
    debateId: d.id,
    currentIndex: d.current_index ?? 0,
    ...blankTurnState,
    transcript: hydrateTranscript(d),
    moderatorScores: hydrateScores(d),
    viewingIndex: mode === "view" ? 0 : null,
  }),

  closeDebate: () => set({
    route: "dashboard",
    debate: null,
    debateId: null,
    currentIndex: 0,
    ...blankTurnState,
    transcript: [],
    moderatorScores: [],
    viewingIndex: null,
  }),

  pushModeratorScore: (s) => set({ moderatorScores: [...get().moderatorScores, s] }),
  setAutoSpeak: (v) => set({ autoSpeak: v }),
  setViewingIndex: (i) => set({ viewingIndex: i }),

  patchTurnText: (index, text) => {
    const s = get();
    const nextTranscript = s.transcript.map((t) =>
      t.index === index && t.phase !== "poi"
        ? { ...t, text, verdict: "moderator_edit" as const }
        : t
    );
    set({
      transcript: nextTranscript,
      // If the edited turn is the currently-live one, keep reviewedText in sync.
      reviewedText: s.currentIndex === index ? text : s.reviewedText,
    });
  },

  logout: () => set({
    route: "auth",
    username: null,
    debate: null,
    debateId: null,
    transcript: [],
    moderatorScores: [],
    viewingIndex: null,
    currentIndex: 0,
    ...blankTurnState,
  }),

  applyServerEvent: (evt) => {
    const s = get();
    switch (evt.event) {
      case "turn_start":
        set({
          currentIndex: evt.index,
          currentPhase: evt.phase,
          streamingText: "",
          reviewedText: "",
          aiScores: null,
          reviewerNotes: "",
          verdict: null,
          turnStatus: "streaming",
          audienceQuestion: evt.audience_question || null,
          viewingIndex: null, // auto-follow live turn
        });
        break;
      case "delta":
        set({ streamingText: s.streamingText + evt.text });
        break;
      case "turn_draft":
        set({ turnStatus: "reviewing", streamingText: evt.draft });
        break;
      case "reviewed":
        set({
          turnStatus: "done",
          reviewedText: evt.final,
          aiScores: evt.scores,
          reviewerNotes: evt.notes,
          verdict: evt.verdict,
          transcript: [
            ...s.transcript,
            {
              index: s.currentIndex,
              side: s.currentPhase!.side,
              phase: s.currentPhase!.phase,
              speaker: s.currentPhase!.speaker,
              text: evt.final,
              verdict: evt.verdict,
              scores: evt.scores,
            },
          ],
        });
        break;
      case "poi_start":
        set({ poiActive: { side: evt.side, text: "" } });
        break;
      case "poi_delta":
        set((st) => ({
          poiActive: st.poiActive
            ? { ...st.poiActive, text: st.poiActive.text + evt.text }
            : { side: evt.side, text: evt.text },
        }));
        break;
      case "poi_end":
        setTimeout(() => set({ poiActive: null }), 4500);
        break;
      case "error":
        set({ turnStatus: "error", reviewerNotes: evt.message });
        break;
    }
  },
}));
