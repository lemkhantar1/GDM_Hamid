# Debater Training Manual — Canonical Reference

> Distilled from `DEBATER TRAINING MANUAL_full version_imp.pdf` (YMV / Anna Lindh Foundation / British Council). Used by the two LangGraph debater agents (to structure every utterance) and by the reviewer agent (to validate compliance before streaming to the UI).

---

## 1. Argument Structure — The CEEL Framework (Module 4, p. 8)

Every argument **must** contain exactly these 4 components. One claim and one explanation per argument; evidence may be multiple.

| Component | Definition |
|---|---|
| **Claim** | The reason the speaker embraces a stance; the cornerstone of the argument. Must be **precise and concise**. |
| **Explanation** | How the claim reflects on the motion and the details lurking within. Must be **understandable by a 5-year-old**. |
| **Evidence** | Support for the claim. Can be **logical** (a chain of reasoning that ends with the claim proved) or **materialistic** (real-world observations, statistics, proven facts). |
| **Link** | Wraps it up: shows how the claim + evidence are valid and connected to the motion, given the team's stance. |

### Good Argument Checklist (p. 8) — used by reviewer agent
- Argument is valid, logical, and relevant to motion and team stance.
- Claim is precise and concise.
- Explanation is accessible (5-year-old rule).
- Evidence is strong and credible.
- Link successfully ties everything to the motion.
- All four elements present.
- Does not repeat itself; interconnects with prior arguments, rebuttals, POIs.

### Worked Example (p. 8)
> **Motion:** THBT capital punishment should be abandoned. **Side:** Government.
> **Claim:** Capital punishment is ineffective.
> **Explanation:** Death doesn't deter crime; it only removes the individual. Others aren't deterred from similar crimes.
> **Evidence:** People still commit killings in countries with the death penalty.
> **Link:** Since the death penalty doesn't prevent crimes, it fails its purpose of protecting society and should be abandoned.

---

## 2. Motion Analysis — 5 steps before any speech (p. 7)

1. Identify key words.
2. Identify the setting (time, location).
3. Identify the type of motion (**Fact / Judgement / Value / Policy**).
4. Identify stakeholders.
5. Build the stance (problem → solution → outcome, with strong links between the three).

Motion types:
- **Fact**: whether something is or is not (e.g., "THBT climate change is the biggest threat to humankind").
- **Judgement**: comparing two opposing views (e.g., "THBT the environment is more important than the economy").
- **Value**: whether something is of inherent value (e.g., "THBT veganism is the best way to live").
- **Policy**: a specific plan of action; proposition must show **need** and **effectiveness**; opposition attacks need and effectiveness (e.g., "THW ban child marriage").

---

## 3. Rebuttal Techniques (Module 5, p. 13)

Four canonical techniques:

| # | Technique | When to use |
|---|---|---|
| 1 | **Reduce importance** | Opponent's fact is plausible but peripheral to the motion. |
| 2 | **Fact ≠ argument** | One fact treated as a full argument — concede fact, deny conclusion. |
| 3 | **Show assertion is false** | The claim is factually wrong — supply the correction. |
| 4 | **Attack generalisations** | "Always / all / never" framings — refute with a counter-example. |

### Rebuttal rules
- Focus on the **main** arguments, not every point.
- Manage your clock.
- Spend most time refuting the **immediately preceding speaker**; may address any earlier speaker in the opposing team.
- **Exclamatory questions are not rebuttal** — you must demonstrably rebut or refute, not merely deny.

### Rebuttal refutation template (p. 9)
(1) Restate target claim → (2) Cite counter-evidence source → (3) Present counter-evidence → (4) Draw reframing conclusion.

**Rebuttal vs Refutation** — the manual distinguishes them:
- *Rebut*: argue the opponent's point is unsound / inapplicable / irrelevant / unimportant.
- *Refute*: present evidence to disprove the opponent's assertion.

---

## 4. Points of Information (POIs) — Interruption Mechanics (p. 14, 17)

- **Duration:** ≤15 seconds per POI; ≥15 seconds between POIs.
- **Protected time:** first and last minute of every speech — no POIs.
- **Acceptance:** the current speaker (here: the human moderator on behalf of the agent) may accept or refuse.
- **Accepted POI time is deducted from the speech clock.**

POIs may be used to:
- Clarify meaning or significance.
- Expose **contradiction** between two points by the same speaker/team/side.
- Plant or reinforce your team's line.
- Highlight **weaknesses** or unaddressed implications.
- Force the speaker to deal with an issue they had not considered.

**Points of Order (POO):** raised when debate rules are broken; handled by the moderator.

---

## 5. Rules of Conduct (p. 17)
- No citing religious texts.
- No personal evidence (personalization).
- No abusive or offensive language.
- Strict adherence to the motion text.
- Strict adherence to timing (preparation, speech, POI, between-POIs).

Oxford format adds:
- Distortion or falsification of evidence is unethical and forbidden.
- Speakers should orally cite sources.
- Answer the question as asked — **pivoting is called out by the moderator**.

---

## 6. Adjudication — The 4-Elements Model (Module 8, p. 19)

The canonical YMV scoring model: **each element is 25%** of a 100-point speaker score. The evaluation fiche in the app implements this exactly.

| # | Element | Weight | Sub-criteria |
|---|---|---|---|
| 1 | **Content** | 25% | Argument structure, strength, and relevance; Definitions; Context; Critical Thinking; Research. |
| 2 | **Refutation** | 25% | Listening; Answering; Engaging through rebuttals and POIs. |
| 3 | **Structure** | 25% | Clarity; Coherence; Understanding of Roles. |
| 4 | **Style** | 25% | Public Speaking; Communication; Delivery. |

### Score Distribution Guide (effective band 65–85)

| Score | Band | Meaning |
|---|---|---|
| **65** | Floor / violation | Ethics violation, silence, or insult. |
| **66–69** | Below average | Understands debate but doesn't master skills; outside scope. |
| **70–73** | Average | Understands role but can't adapt content/delivery; masters some roles. |
| **74–77** | Above average | Plays role on all levels; represents team's stance. |
| **78–81** | Strong | All roles mastered; adequate general knowledge. |
| **82–85** | Expert | Deep expertise + exceptional presentation/style. |

Process: during the debate, judges take notes on the flowchart → deliberate → assign score /100 per speaker → sum per team → rank.

### Oxford-specific winner determination (p. 20)
Audience votes **before and after** the debate (For / Against / Undecided). Winner = team with **the largest vote swing**. In this app the final verdict is delivered by the human moderator after reviewing their accumulated evaluations.

---

## 7. Closing Speech (Whip / Final) Rules (p. 20)

- **No new arguments.**
- **Summarise** own team's case.
- **Rebut** remaining opposing points.
- Identify and frame the **Points of Clash** — show why your side wins each clash.
- **Clarify** anything that became confused.
- **Persuade** the audience (especially undecided voters).

---

## 8. Public Speaking / Delivery (Module 9, p. 20–21)

### Voice
- **Projection**: vary volume; wide for large, close/soft to draw attention.
- **Pitch**: don't alter natural pitch — vary for impact. High = excitement/shock. Low = disappointment/sarcasm.
- **Pace**: mix it up; use **pauses** to mark end of ideas and resonate key points; too-long pauses suggest lost thought.
- **Tone**: friendly, empathetic, warm, combative, or abrasive — match to point and listener.
- **Articulation / Enunciation**: *"When you enunciate clearly, you're going to show your teeth."*

### Expression
- Correct pronunciation; repeated mispronunciation = underprepared.
- Use a language both familiar to speaker and audience; translate foreign words.
- Develop your **own** style — don't imitate.

### Non-verbal
- **Eye contact** — confidence, trust, persuasiveness.
- **Facial expressions** — measured, never theatrical.
- **Body language** — head tilt = interested; lowered head = tired; looking at ceiling = avoidance.

---

## 9. Logical Fallacies (selection from Modules 5 + 10)
- **Ad hominem** — attacks person, not argument.
- **Straw man** — misrepresents opponent's argument to beat it easily.
- **False dichotomy** — oversimplifies options to two extremes.
- **Slippery slope** — chains reasonable premise to improbable extreme.
- **Circular argument / begging the question** — presumes the thing being proved.
- **Generalisation** — "always / all / never" — attackable with a counter-example.
- **Insufficient evidence / non sequitur** — single fact misused as full argument.
- **Contradiction** — internal inconsistency; target of POIs.
- **Personalization** — using anecdotes as evidence (banned).
- **Pivoting / evasion** — not answering the question; called out by moderator.

---

## 10. Application Mapping

| Manual concept | App artefact |
|---|---|
| CEEL framework | System prompt of each debater agent; reviewer validates its presence. |
| Good Argument Checklist | Reviewer agent's revision loop. |
| Rebuttal techniques #1–4 | Response-phase prompt (Opposition's second-speaker prompt, etc.). |
| POI mechanics | Interrupt button in moderator console → 15-second POI turn. |
| 4-Elements Model (Content / Refutation / Structure / Style) | Evaluation panel on the right side of the UI. |
| 65–85 score guide | Sliders/bands in the evaluation panel. |
| Closing speech rules | Final-speech prompt (explicitly forbids new arguments). |
| Rules of conduct | Global system prompt prefix for both agents + reviewer hard block. |
| Oxford phase table | Backend state machine (see `backend/agents.py`). |
