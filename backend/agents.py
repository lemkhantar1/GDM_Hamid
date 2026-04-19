"""
LangGraph agent graph for the debate arena.

Nodes:
  generate  → the side's debater produces a draft response
  review    → reviewer agent scores + optionally revises
  finalize  → emits the final text + scores

The graph is invoked once per debate "turn" (one speaker, one phase).
Streaming of the debater node's tokens happens via an async generator
in main.py; the review + finalize nodes are synchronous finishing steps.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import AsyncIterator, Optional

from anthropic import AsyncAnthropic

from prompts import (
    PHASE_USER_PROMPTS,
    REVIEWER_SYSTEM,
    debater_system_prompt,
)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5")
REVIEWER_MODEL = os.getenv("ANTHROPIC_REVIEWER_MODEL", MODEL)

# Singleton client — avoid create/close churn that triggers httpx cleanup bugs.
_CLIENT: Optional[AsyncAnthropic] = None


@dataclass
class TurnContext:
    side: str                 # "proposition" | "opposition"
    phase: str                # key in PHASE_USER_PROMPTS
    motion: str
    constraints: str
    transcript: list[dict]    # [{side, phase, speaker, text}, ...] of prior turns
    audience_question: Optional[str] = None
    poi_prompt: Optional[str] = None   # used only during poi phase


@dataclass
class TurnResult:
    draft: str
    final: str
    verdict: str              # "accept" | "revise"
    scores: dict              # {content, refutation, structure, style}
    notes: str


def _build_user_message(ctx: TurnContext) -> str:
    base = PHASE_USER_PROMPTS[ctx.phase]

    extras: list[str] = []
    if ctx.transcript:
        transcript_lines = []
        for t in ctx.transcript[-6:]:
            transcript_lines.append(
                f"[{t['side'].upper()} · {t.get('speaker','?')} · {t['phase']}]\n{t['text']}"
            )
        extras.append("Recent transcript (most recent first in context):\n\n" + "\n\n---\n\n".join(transcript_lines))

    if ctx.phase == "qa_answer" and ctx.audience_question:
        extras.append(f"Audience question: {ctx.audience_question}")

    if ctx.phase == "poi" and ctx.poi_prompt:
        extras.append(f"Focus of the POI: {ctx.poi_prompt}")

    return base + ("\n\n" + "\n\n".join(extras) if extras else "")


def make_client() -> AsyncAnthropic:
    global _CLIENT
    if _CLIENT is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        _CLIENT = AsyncAnthropic(api_key=api_key)
    return _CLIENT


async def generate_stream(ctx: TurnContext) -> AsyncIterator[str]:
    """Stream the debater's draft response, token by token."""
    client = make_client()
    system = debater_system_prompt(ctx.side, ctx.motion, ctx.constraints)
    user = _build_user_message(ctx)

    # Tight word budgets per phase — keeps speeches human and punchy, not essay-length.
    if ctx.phase in ("opening_1", "opening_2"):
        max_tokens = 420
    elif ctx.phase == "opening_3":
        max_tokens = 520
    elif ctx.phase == "final":
        max_tokens = 520
    elif ctx.phase == "qa_answer":
        max_tokens = 320
    elif ctx.phase == "deliberation":
        max_tokens = 260
    elif ctx.phase == "poi":
        max_tokens = 90
    else:
        max_tokens = 420

    async with client.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def review(ctx: TurnContext, draft: str) -> dict:
    """Reviewer agent returns a JSON verdict + optional revision."""
    client = make_client()

    user = f"""\
Phase: {ctx.phase}
Side: {ctx.side}
Motion: {ctx.motion}

Draft to review:
---
{draft}
---

Return the JSON verdict now."""

    msg = await client.messages.create(
        model=REVIEWER_MODEL,
        max_tokens=1400,
        system=REVIEWER_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )

    raw = "".join(block.text for block in msg.content if block.type == "text").strip()
    # Trim accidental code fences just in case.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].lstrip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {
            "verdict": "accept",
            "scores": {"content": 18, "refutation": 18, "structure": 18, "style": 18},
            "notes": "Reviewer output unparseable; defaulting to accept.",
            "revised_text": "",
        }

    parsed.setdefault("verdict", "accept")
    parsed.setdefault("scores", {"content": 18, "refutation": 18, "structure": 18, "style": 18})
    parsed.setdefault("notes", "")
    parsed.setdefault("revised_text", "")
    return parsed


async def run_turn(ctx: TurnContext, draft: str) -> TurnResult:
    """Run the review step after streaming completed, return final text + scores."""
    verdict_obj = await review(ctx, draft)
    verdict = verdict_obj["verdict"]
    final = draft
    if verdict == "revise" and verdict_obj.get("revised_text"):
        final = verdict_obj["revised_text"]
    return TurnResult(
        draft=draft,
        final=final,
        verdict=verdict,
        scores=verdict_obj["scores"],
        notes=verdict_obj.get("notes", ""),
    )
