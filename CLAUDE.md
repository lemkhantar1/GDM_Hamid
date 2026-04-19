# CLAUDE.md — Oxford Debate Arena (GDM_Hamid)

Interactive 3-vs-3 adapted Oxford-style debate arena. Two Claude Opus agents
debate under a human moderator who advances phases manually, authorises
POI interruptions, and records live YMV 4-Elements evaluations.

## Canonical references (single source of truth)
- `docs/OXFORD_FORMAT.md` — phase table, timings, judging criteria, interruption rules.
- `docs/DEBATER_MANUAL.md` — CEEL argument framework, rebuttal techniques #1–4, POI mechanics, 4-Elements adjudication model (Content / Refutation / Structure / Style — 25% each, band 65–85), closing-speech rules, delivery tips, fallacies.

Do not diverge silently from these docs. If a spec gap appears, fall back to the raw PDFs in the repo root.

## Stack
- **Backend**: Python FastAPI · LangGraph · Anthropic SDK · WebSocket (`backend/`)
- **Frontend**: React + Vite + TypeScript · Framer Motion · Tailwind · Zustand (`frontend/`)

## Agent architecture
- `proposition` agent and `opposition` agent — each invoked with a side-specific system prompt built in `backend/prompts.py`.
- `reviewer` agent — validates every draft against the CEEL checklist, closing-speech rules, conduct rules, and word budget, then either accepts or returns a revised version. See `review()` in `backend/agents.py`.
- Phase advancement is always **human-gated** via the WebSocket `{"action":"next"}` event.
- POIs are triggered by the moderator clicking the POI button; the opposing agent produces a ≤40-word sharp interruption.

## Run locally
```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# .env already contains ANTHROPIC_API_KEY and ANTHROPIC_MODEL
uvicorn main:app --reload --port 8787

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Vite proxies `/api/*` and `/ws/*` to the backend on 8787.

## Design invariants
1. **Human-gated state machine.** Backend never auto-advances.
2. **Reviewer loop is hard, not soft.** A violation of CEEL, closing-speech "no new arguments", or conduct rules MUST trigger `verdict=revise`.
3. **Evaluation fiche must mirror the manual.** 4 sliders (Content / Refutation / Structure / Style), each 0–25, total mapped to the 65–85 band with labelled descriptors.
4. **VFX is decorative but never obstructive.** Animations must not hide or delay the streaming text.
5. **Conduct rules are enforced in the system prompt.** Agents do not cite religious texts, fabricate stats, or use personal anecdotes as evidence.

## File map
```
backend/
  main.py        FastAPI app, WebSocket, phase sequence
  agents.py      LangGraph-style turn runner + reviewer
  prompts.py     CEEL prompt, phase user prompts, reviewer system prompt
frontend/src/
  App.tsx                    top-level router (setup ↔ arena)
  components/
    VFXBackground.tsx        canvas particles + grid + orbs + vignette
    SetupScreen.tsx          inputs: motion, constraints, team names, audience questions
    DebateArena.tsx          split layout + WebSocket wiring
    DebaterPanel.tsx         streaming text column (one per side) with CEEL highlighting
    EvaluationPanel.tsx      live YMV fiche with 4 sliders + running totals + reviewer notes
    ModeratorConsole.tsx     Next / POI / Final-verdict controls + phase timeline
    VerdictModal.tsx         final verdict picker
  lib/
    types.ts    api.ts    store.ts (zustand)
docs/
  OXFORD_FORMAT.md
  DEBATER_MANUAL.md
```
