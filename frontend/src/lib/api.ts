import { authHeaders, getToken } from "./auth";
import type { PhaseDef } from "./types";

export interface DebateSummary {
  id: string;
  motion: string;
  pro_team_name: string;
  con_team_name: string;
  status: "pending" | "running" | "completed";
  current_index: number;
  total_phases: number;
  created_at: number;
  updated_at: number;
}

export interface DebateRecord {
  id: string;
  owner: string;
  motion: string;
  constraints: string;
  pro_team_name: string;
  con_team_name: string;
  audience_questions: string[];
  transcript: any[];
  scores: Record<string, any[]>;
  current_index: number;
  total_phases: number;
  status: "pending" | "running" | "completed";
  timing_multiplier: number;
  methodology: string;
  created_at: number;
  updated_at: number;
}

async function asError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return j.detail ?? j.message ?? r.statusText;
  } catch {
    return r.statusText;
  }
}

// ----------------------------------------------------------------------
// CRUD debates
// ----------------------------------------------------------------------

export async function listDebates(): Promise<DebateSummary[]> {
  const r = await fetch("/api/debates", { headers: authHeaders() });
  if (!r.ok) throw new Error(await asError(r));
  const j = await r.json();
  return j.debates;
}

export async function createDebate(body: {
  motion: string;
  constraints: string;
  pro_team_name: string;
  con_team_name: string;
  audience_questions: string[];
  timing_multiplier: number;
}): Promise<DebateRecord> {
  const r = await fetch("/api/debates", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await asError(r));
  return r.json();
}

export async function getDebate(id: string): Promise<DebateRecord> {
  const r = await fetch(`/api/debates/${id}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await asError(r));
  return r.json();
}

export async function deleteDebate(id: string): Promise<void> {
  const r = await fetch(`/api/debates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await asError(r));
}

export async function fetchPhases(): Promise<PhaseDef[]> {
  const r = await fetch("/api/phases");
  if (!r.ok) throw new Error(await asError(r));
  const j = await r.json();
  return j.phases;
}

export async function updateTurn(debateId: string, index: number, text: string): Promise<void> {
  const r = await fetch(`/api/debates/${debateId}/turn/${index}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(await asError(r));
}

export async function postScore(debateId: string, body: {
  turn_index: number;
  speaker: string;
  content: number;
  refutation: number;
  structure: number;
  style: number;
  note: string;
}): Promise<void> {
  const r = await fetch(`/api/debates/${debateId}/score`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await asError(r));
}

// ----------------------------------------------------------------------
// WebSocket — auth token is passed as query string (headers unsupported in browser WS).
// ----------------------------------------------------------------------

export function openSocket(debateId: string, onEvent: (evt: any) => void): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const token = getToken() ?? "";
  const ws = new WebSocket(`${proto}://${location.host}/ws/${debateId}?token=${encodeURIComponent(token)}`);
  ws.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* noop */
    }
  };
  return ws;
}
