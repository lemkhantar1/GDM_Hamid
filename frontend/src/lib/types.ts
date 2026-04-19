export type Side = "proposition" | "opposition";

export type PhaseKey =
  | "opening_1"
  | "opening_2"
  | "opening_3"
  | "deliberation"
  | "qa_answer"
  | "final"
  | "poi";

export interface PhaseDef {
  kind: "speech" | "qa";
  side: Side;
  phase: PhaseKey;
  speaker: string;
  label: string;
}

export interface Scores {
  content: number;
  refutation: number;
  structure: number;
  style: number;
}

export type Verdict = "accept" | "revise" | "moderator_edit";

export interface TranscriptEntry {
  index: number;
  side: Side;
  phase: PhaseKey;
  speaker: string;
  text: string;
  verdict?: Verdict;
  scores?: Scores;
}

export interface SessionState {
  id: string;
  motion: string;
  constraints: string;
  pro_team_name: string;
  con_team_name: string;
  audience_questions: string[];
  current_index: number;
}

export interface ModeratorScore extends Scores {
  note: string;
  speaker: string;
  turn_index: number;
  timestamp: number;
}
