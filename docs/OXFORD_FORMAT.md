# Oxford-Style Debate (3 vs. 3) — Adapted Format

> Canonical reference extracted from `Oxford format (adapted).pdf`. Used by LangGraph debater/reviewer agents and the moderator console to sequence the debate and validate each step.

## Philosophy
Oxford-style debate is a structured, competitive exchange that emphasises logical argumentation and persuasive rhetoric. This adapted version runs **3 vs. 3** with tight timing and explicit phases.

## Team Composition (per side)
| Role | Duty |
|---|---|
| **First Speaker** | Introduces the team's stance and presents the first structured argument. |
| **Second Speaker** | Expands on the stance and presents the second argument. |
| **Third Speaker** | Reinforces arguments and provides counterpoints to the opposing side. |
| **Final Speaker** | One speaker chosen by the team to deliver the closing speech. |

Two sides: **Proposition** (supports the motion) and **Opposition** (rejects the motion).

## Debate Flow & Time Allocation

| # | Phase | Activity | Time |
|---|---|---|---|
| 1 | **Opening Arguments** | Each speaker presents **2 structured arguments** supporting the team's stance. | **3 min/speaker** (total 18 min) |
| 2 | **Deliberation** | Each team discusses privately with the moderator. Strategize, sharpen rebuttals, clarify key points. Moderator may pose guiding questions. | **3 min/team** |
| 3 | **Audience Q&A** | Audience has submitted questions beforehand; moderator selects **one question per team member**. Each team member has **2 min** to answer. | **2 min/answer** |
| 4 | **Final Speech** | One speaker per team (chosen internally) delivers the closing remarks: summarise key arguments, respond to counterarguments, give a compelling final stance. | **3 min/team** |

Speaking turns alternate Proposition → Opposition within each phase.

## Rules & Judging Criteria
- **Relevance** — Arguments stay on topic and are logically structured.
- **Evidence & Persuasion** — Credible sources and persuasive rhetoric.
- **Engagement** — Responds to opponents' arguments and engages the audience.
- **Delivery** — Clarity, confidence, effective use of time.

## Interruption Handling (Adapted Oxford + YMV overlay)
The adapted Oxford PDF doesn't formalise POIs, but the application layers in the YMV-manual POI discipline:
- Opposing agent may **request an interruption** ("Point of Information") at any moment a non-protected minute is playing.
- Interruption requests are routed to the **human moderator**, who accepts or refuses on behalf of the current speaker.
- If accepted: up to **15 seconds** of POI, deducted from the current speaker's clock.
- **First and last minute** of every speech are protected — no interruptions allowed.

## Phase → State Machine (application view)
```
SETUP → OPENING_ARGS(P1 → O1 → P2 → O2 → P3 → O3)
      → DELIBERATION(P_team → O_team)
      → AUDIENCE_QA(one per speaker, alternating)
      → FINAL_SPEECH(P_final → O_final)
      → VERDICT(human moderator decides)
```

The application progresses the state machine **only when the human moderator clicks "Next"** — agents never auto-advance.
