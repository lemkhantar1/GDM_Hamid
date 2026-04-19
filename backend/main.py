"""
FastAPI backend for the Oxford Debate Arena.

All routes (except auth + health) require a Bearer token. Debates are persisted
to SQLite so the dashboard can list / view / delete them across sessions.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

from agents import TurnContext, generate_stream, run_turn  # noqa: E402
from auth import (  # noqa: E402
    authenticate,
    decode_token,
    init_db as init_users_db,
    make_token,
    register_user,
)
from db import (  # noqa: E402
    delete_debate,
    get_debate,
    init_db as init_debates_db,
    insert_debate,
    list_debates,
    update_debate,
)

# ---------------------------------------------------------------------------
# Phase sequence — 16 turns of the adapted 3-vs-3 Oxford format.
# ---------------------------------------------------------------------------

def build_phase_sequence() -> List[dict]:
    seq: List[dict] = []
    order = [
        ("proposition", "opening_1", "P1"),
        ("opposition",  "opening_1", "O1"),
        ("proposition", "opening_2", "P2"),
        ("opposition",  "opening_2", "O2"),
        ("proposition", "opening_3", "P3"),
        ("opposition",  "opening_3", "O3"),
    ]
    for side, phase, speaker in order:
        seq.append({"kind": "speech", "side": side, "phase": phase, "speaker": speaker, "label": f"{speaker} · Ouverture"})

    seq.append({"kind": "speech", "side": "proposition", "phase": "deliberation", "speaker": "Équipe", "label": "Proposition · Concertation"})
    seq.append({"kind": "speech", "side": "opposition",  "phase": "deliberation", "speaker": "Équipe", "label": "Opposition · Concertation"})

    for i in range(3):
        seq.append({"kind": "qa", "side": "proposition", "phase": "qa_answer", "speaker": f"P{i+1}", "label": f"P{i+1} · Q&R"})
        seq.append({"kind": "qa", "side": "opposition",  "phase": "qa_answer", "speaker": f"O{i+1}", "label": f"O{i+1} · Q&R"})

    seq.append({"kind": "speech", "side": "proposition", "phase": "final", "speaker": "P-Final", "label": "Proposition · Conclusion"})
    seq.append({"kind": "speech", "side": "opposition",  "phase": "final", "speaker": "O-Final", "label": "Opposition · Conclusion"})
    return seq


PHASES = build_phase_sequence()


# ---------------------------------------------------------------------------
# Pydantic schemas + in-memory runtime state (hydrated from SQLite).
# ---------------------------------------------------------------------------

class Debate(BaseModel):
    id: str
    owner: str
    motion: str
    constraints: str = ""
    timing_multiplier: float = 1.0
    methodology: str = "oxford_adapted_3v3"
    pro_team_name: str = "Proposition"
    con_team_name: str = "Opposition"
    audience_questions: List[str] = Field(default_factory=list)
    transcript: List[dict] = Field(default_factory=list)
    scores: Dict[str, List[dict]] = Field(default_factory=dict)
    current_index: int = 0
    total_phases: int = len(PHASES)
    status: str = "pending"
    created_at: float = 0.0
    updated_at: float = 0.0


# Cache of debates currently loaded for WS sessions (write-through to SQLite).
RUNTIME: Dict[str, Debate] = {}


def _load_debate(debate_id: str, owner: str) -> Optional[Debate]:
    if debate_id in RUNTIME and RUNTIME[debate_id].owner == owner:
        return RUNTIME[debate_id]
    raw = get_debate(debate_id, owner)
    if not raw:
        return None
    d = Debate(**{**raw, "id": debate_id, "owner": owner})
    RUNTIME[debate_id] = d
    return d


def _persist(d: Debate) -> None:
    update_debate(d.id, d.model_dump())


class CreateDebateBody(BaseModel):
    motion: str
    constraints: str = ""
    timing_multiplier: float = 1.0
    pro_team_name: str = "Proposition"
    con_team_name: str = "Opposition"
    audience_questions: List[str] = Field(default_factory=list)


class ScoreBody(BaseModel):
    turn_index: int
    speaker: str
    content: int
    refutation: int
    structure: int
    style: int
    note: str = ""


class TTSBody(BaseModel):
    side: str
    text: str


class AuthBody(BaseModel):
    username: str
    password: str


# ---------------------------------------------------------------------------
# App setup.
# ---------------------------------------------------------------------------

app = FastAPI(title="Oxford Debate Arena")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _on_startup() -> None:
    init_users_db()
    init_debates_db()


def get_current_user(authorization: str = Header("")) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "auth required")
    token = authorization.split(" ", 1)[1].strip()
    username = decode_token(token)
    if not username:
        raise HTTPException(401, "invalid or expired token")
    return username


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/api/auth/register")
def auth_register(body: AuthBody) -> dict:
    if len(body.username.strip()) < 3:
        raise HTTPException(400, "le pseudo doit faire au moins 3 caractères")
    if len(body.password) < 6:
        raise HTTPException(400, "le mot de passe doit faire au moins 6 caractères")
    ok = register_user(body.username.strip(), body.password)
    if not ok:
        raise HTTPException(409, "ce pseudo est déjà pris")
    u = body.username.strip()
    return {"token": make_token(u), "username": u}


@app.post("/api/auth/login")
def auth_login(body: AuthBody) -> dict:
    u = body.username.strip()
    if not authenticate(u, body.password):
        raise HTTPException(401, "identifiants invalides")
    return {"token": make_token(u), "username": u}


@app.get("/api/auth/me")
def auth_me(user: str = Depends(get_current_user)) -> dict:
    return {"username": user}


# ---------------------------------------------------------------------------
# Health + phases (public).
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "model": os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5"),
        "has_key": bool(os.getenv("ANTHROPIC_API_KEY")),
        "phases": len(PHASES),
    }


@app.get("/api/phases")
def get_phases() -> dict:
    return {"phases": PHASES}


# ---------------------------------------------------------------------------
# Debates CRUD — all require auth.
# ---------------------------------------------------------------------------

@app.get("/api/debates")
def debates_list(user: str = Depends(get_current_user)) -> dict:
    return {"debates": list_debates(user)}


@app.post("/api/debates")
def debates_create(body: CreateDebateBody, user: str = Depends(get_current_user)) -> Debate:
    did = uuid.uuid4().hex[:12]
    d = Debate(
        id=did,
        owner=user,
        motion=body.motion,
        constraints=body.constraints,
        timing_multiplier=body.timing_multiplier,
        pro_team_name=body.pro_team_name,
        con_team_name=body.con_team_name,
        audience_questions=body.audience_questions,
        total_phases=len(PHASES),
    )
    insert_debate(did, user, d.model_dump())
    RUNTIME[did] = d
    return d


@app.get("/api/debates/{did}")
def debates_get(did: str, user: str = Depends(get_current_user)) -> Debate:
    d = _load_debate(did, user)
    if not d:
        raise HTTPException(404, "débat introuvable")
    return d


@app.delete("/api/debates/{did}")
def debates_delete(did: str, user: str = Depends(get_current_user)) -> dict:
    RUNTIME.pop(did, None)
    ok = delete_debate(did, user)
    if not ok:
        raise HTTPException(404, "débat introuvable")
    return {"ok": True}


class UpdateTurnBody(BaseModel):
    text: str


@app.put("/api/debates/{did}/turn/{index}")
def debates_update_turn(did: str, index: int, body: UpdateTurnBody, user: str = Depends(get_current_user)) -> dict:
    """Overwrite the text of a turn in the transcript. Reviewer verdict is flipped
    to `moderator_edit` so it's clear the text was hand-tuned."""
    d = _load_debate(did, user)
    if not d:
        raise HTTPException(404, "débat introuvable")

    target_idx = -1
    for i, t in enumerate(d.transcript):
        if t.get("index") == index and t.get("phase") != "poi":
            target_idx = i
            break
    if target_idx < 0:
        raise HTTPException(404, "tour introuvable")

    new_text = body.text.strip()
    if not new_text:
        raise HTTPException(400, "le texte ne peut pas être vide")

    d.transcript[target_idx]["text"] = new_text
    d.transcript[target_idx]["verdict"] = "moderator_edit"
    _persist(d)
    return {"ok": True, "index": index, "text": new_text}


@app.post("/api/debates/{did}/score")
def debates_score(did: str, body: ScoreBody, user: str = Depends(get_current_user)) -> dict:
    d = _load_debate(did, user)
    if not d:
        raise HTTPException(404, "débat introuvable")
    d.scores.setdefault(body.speaker, []).append(body.model_dump())
    _persist(d)
    return {"ok": True, "total_scores": sum(len(v) for v in d.scores.values())}


# ---------------------------------------------------------------------------
# ElevenLabs TTS (auth required).
# ---------------------------------------------------------------------------

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


def _voice_id_for(side: str) -> str:
    if side == "proposition":
        return os.getenv("ELEVEN_VOICE_PRO", "")
    if side == "opposition":
        return os.getenv("ELEVEN_VOICE_CON", "")
    raise HTTPException(400, "invalid side")


@app.post("/api/tts")
async def tts(body: TTSBody, _user: str = Depends(get_current_user)) -> StreamingResponse:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(500, "ELEVENLABS_API_KEY not set")

    voice_id = _voice_id_for(body.side)
    if not voice_id:
        raise HTTPException(500, f"No voice id configured for side={body.side}")

    model_id = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    clean_text = _strip_ceel_labels(body.text)

    url = f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}"
    payload = {
        "text": clean_text,
        "model_id": model_id,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75, "style": 0.25, "use_speaker_boost": True},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            url,
            json=payload,
            headers={
                "xi-api-key": api_key,
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
            },
        )

    if r.status_code != 200:
        raise HTTPException(r.status_code, f"ElevenLabs error: {r.text[:400]}")

    async def iter_audio():
        data = r.content
        chunk = 16384
        for i in range(0, len(data), chunk):
            yield data[i : i + chunk]

    return StreamingResponse(iter_audio(), media_type="audio/mpeg")


def _strip_ceel_labels(text: str) -> str:
    markers = [
        "**Claim:**", "**Explanation:**", "**Evidence:**", "**Link:**",
        "**Thèse:**", "**Thèse :**",
        "**Explication:**", "**Explication :**",
        "**Preuve:**", "**Preuve :**",
        "**Lien:**", "**Lien :**",
    ]
    for marker in markers:
        text = text.replace(marker, "")
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text.strip()


# ---------------------------------------------------------------------------
# WebSocket — run one debate turn at a time.
#
# Auth passed as query string ?token=... since browsers can't set headers on WS.
# ---------------------------------------------------------------------------

@app.websocket("/ws/{did}")
async def debate_ws(ws: WebSocket, did: str, token: str = ""):
    await ws.accept()

    # Auth
    username = decode_token(token) if token else None
    if not username:
        await ws.send_json({"event": "error", "message": "auth requise"})
        await ws.close()
        return

    d = _load_debate(did, username)
    if not d:
        await ws.send_json({"event": "error", "message": "débat introuvable"})
        await ws.close()
        return

    try:
        while True:
            msg = await ws.receive_json()
            action = msg.get("action")

            if action == "next":
                await _run_next_turn(ws, d)
            elif action == "poi":
                await _run_poi(ws, d, msg.get("side"), msg.get("prompt", ""))
            elif action == "reset":
                d.current_index = 0
                d.transcript.clear()
                _persist(d)
                await ws.send_json({"event": "reset_ok"})
            else:
                await ws.send_json({"event": "error", "message": f"unknown action {action}"})

    except WebSocketDisconnect:
        return


async def _run_next_turn(ws: WebSocket, d: Debate) -> None:
    if d.current_index >= len(PHASES):
        await ws.send_json({"event": "done"})
        return

    phase_def = PHASES[d.current_index]
    kind = phase_def["kind"]

    audience_question: Optional[str] = None
    if kind == "qa":
        idx = len([t for t in d.transcript if t.get("phase") == "qa_answer"])
        if idx < len(d.audience_questions):
            audience_question = d.audience_questions[idx]
        else:
            audience_question = "Quelle est la raison la plus importante pour laquelle le public devrait être de votre côté ?"

    ctx = TurnContext(
        side=phase_def["side"],
        phase=phase_def["phase"],
        motion=d.motion,
        constraints=d.constraints,
        transcript=list(d.transcript),
        audience_question=audience_question,
    )

    await ws.send_json({
        "event": "turn_start",
        "index": d.current_index,
        "phase": phase_def,
        "audience_question": audience_question,
    })

    collected: list[str] = []
    try:
        async for chunk in generate_stream(ctx):
            collected.append(chunk)
            await ws.send_json({"event": "delta", "text": chunk})
    except Exception as e:
        await ws.send_json({"event": "error", "message": f"generate failed: {e}"})
        return

    draft = "".join(collected).strip()
    await ws.send_json({"event": "turn_draft", "draft": draft})

    try:
        result = await run_turn(ctx, draft)
    except Exception as e:
        await ws.send_json({"event": "error", "message": f"review failed: {e}"})
        return

    d.transcript.append({
        "side": phase_def["side"],
        "phase": phase_def["phase"],
        "speaker": phase_def["speaker"],
        "label": phase_def["label"],
        "text": result.final,
        "verdict": result.verdict,
        "scores": result.scores,
        "index": d.current_index,
        "audience_question": audience_question,
    })
    d.current_index += 1
    _persist(d)

    await ws.send_json({
        "event": "reviewed",
        "verdict": result.verdict,
        "scores": result.scores,
        "notes": result.notes,
        "final": result.final,
        "next_index": d.current_index,
    })


async def _run_poi(ws: WebSocket, d: Debate, side: Optional[str], prompt: str) -> None:
    if side not in ("proposition", "opposition"):
        await ws.send_json({"event": "error", "message": "poi: invalid side"})
        return

    ctx = TurnContext(
        side=side,
        phase="poi",
        motion=d.motion,
        constraints=d.constraints,
        transcript=list(d.transcript),
        poi_prompt=prompt or "Expose une faiblesse dans le propos de l'orateur en cours.",
    )

    await ws.send_json({"event": "poi_start", "side": side})
    collected: list[str] = []
    try:
        async for chunk in generate_stream(ctx):
            collected.append(chunk)
            await ws.send_json({"event": "poi_delta", "text": chunk, "side": side})
    except Exception as e:
        await ws.send_json({"event": "error", "message": f"poi failed: {e}"})
        return

    text = "".join(collected).strip()
    d.transcript.append({
        "side": side,
        "phase": "poi",
        "speaker": "POI",
        "label": "POI",
        "text": text,
        "index": -1,
    })
    _persist(d)
    await ws.send_json({"event": "poi_end", "side": side, "text": text})
