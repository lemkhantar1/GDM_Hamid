import { useSyncExternalStore } from "react";
import { authHeaders } from "./auth";
import type { Side } from "./types";

/**
 * TTS singleton with React 18 useSyncExternalStore subscription.
 *
 * Contract:
 *   - `playTTS(side, text)` starts/toggles playback for a side.
 *   - `stopTTS()` halts any current playback.
 *   - `useTTSState()` returns live { side, status } inside React components.
 *
 * A fresh HTMLAudioElement is created per play to dodge Chrome's
 * "The play() request was interrupted by a new load request" race.
 */

export type TTSState = { side: Side; status: "loading" | "playing" } | null;

let state: TTSState = null;
const listeners = new Set<() => void>();

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentAbort: AbortController | null = null;
let seq = 0; // increments per play; lets async work detect obsolescence

function notify() {
  for (const l of listeners) l();
}

function setState(s: TTSState) {
  state = s;
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): TTSState {
  return state;
}

function getServerSnapshot(): TTSState {
  return null;
}

export function useTTSState(): TTSState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getTTSState(): TTSState {
  return state;
}

function disposeAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* noop */
    }
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.onplay = null;
    currentAudio.onpause = null;
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

export function stopTTS(): void {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  disposeAudio();
  seq += 1; // invalidate any in-flight play
  setState(null);
}

export async function playTTS(side: Side, text: string): Promise<void> {
  // Toggle-stop when clicking the same side that is active.
  if (state && state.side === side) {
    stopTTS();
    return;
  }

  stopTTS();

  const mySeq = ++seq;
  setState({ side, status: "loading" });
  currentAbort = new AbortController();

  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ side, text }),
      signal: currentAbort.signal,
    });
    if (mySeq !== seq) return; // obsolete
    if (!r.ok) {
      const err = await r.text().catch(() => "");
      throw new Error(`TTS ${r.status}: ${err.slice(0, 200)}`);
    }
    const blob = await r.blob();
    if (mySeq !== seq) return;

    const url = URL.createObjectURL(blob);
    currentUrl = url;

    const a = new Audio(url);
    a.preload = "auto";
    a.onended = () => {
      if (mySeq !== seq) return;
      stopTTS();
    };
    a.onerror = () => {
      if (mySeq !== seq) return;
      stopTTS();
    };
    currentAudio = a;

    // Switch to "playing" once the element actually starts.
    const onPlay = () => {
      if (mySeq !== seq) return;
      setState({ side, status: "playing" });
    };
    a.onplay = onPlay;

    try {
      await a.play();
      // Some browsers don't fire onplay reliably — sync up here too.
      if (mySeq === seq && (!state || state.status !== "playing")) {
        setState({ side, status: "playing" });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      throw e;
    }
  } catch (e: any) {
    if (mySeq !== seq) return;
    if (e?.name !== "AbortError") {
      console.error("TTS failed:", e);
    }
    stopTTS();
  }
}
