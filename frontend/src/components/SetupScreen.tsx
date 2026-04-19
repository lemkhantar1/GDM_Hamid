import { motion } from "framer-motion";
import { useState } from "react";
import { createDebate, fetchPhases } from "../lib/api";
import { useStore } from "../lib/store";

const SAMPLE_MOTIONS = [
  "Cette assemblée croit que l'IA apportera plus de bien que de mal à l'humanité.",
  "Cette assemblée interdirait les réseaux sociaux aux moins de 16 ans.",
  "Cette assemblée croit que le revenu universel devrait remplacer toutes les aides sociales.",
  "Cette assemblée donnerait la priorité à l'exploration spatiale plutôt qu'à celle des océans.",
];

export function SetupScreen() {
  const { setPhases, openDebate, setRoute } = useStore();
  const [motion_, setMotion] = useState(SAMPLE_MOTIONS[0]);
  const [constraints, setConstraints] = useState(
    "Public général informé. Restez accessibles sur les références culturelles."
  );
  const [proName, setProName] = useState("Équipe Horizon");
  const [conName, setConName] = useState("Équipe Méridien");
  const [timing, setTiming] = useState(1);
  const [questions, setQuestions] = useState<string[]>([
    "Quelle est la preuve la plus forte de votre côté ?",
    "Quel argument adverse vous inquiète le plus — et pourquoi reste-t-il faux ?",
    "Quelle issue, dans dix ans, prouverait que vous aviez raison ?",
  ]);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const [debate, phases] = await Promise.all([
        createDebate({
          motion: motion_,
          constraints,
          pro_team_name: proName,
          con_team_name: conName,
          audience_questions: questions.filter((q) => q.trim().length > 0),
          timing_multiplier: timing,
        }),
        fetchPhases(),
      ]);
      setPhases(phases);
      openDebate(debate, "arena");
    } catch (e: any) {
      alert("Échec du démarrage : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="surface-soft max-w-[1100px] w-full p-6 md:p-8 grain relative"
      >
        <div className="flex items-start justify-between gap-6 mb-5">
          <div>
            <button
              onClick={() => setRoute("dashboard")}
              className="chip hover:bg-white/10 mb-3 cursor-pointer"
            >
              ← retour à la bibliothèque
            </button>
            <span className="chip chip-accent mb-2">Oxford, adapté &middot; trois contre trois</span>
            <h1 className="font-display text-4xl md:text-5xl hero-title tracking-tight leading-[1.05]">
              Nouveau débat
            </h1>
          </div>
          <p className="hidden md:block font-speech italic text-[13px] text-muted leading-relaxed max-w-sm pt-2">
            Deux voix de Claude Opus plaident sous votre arbitrage. Chaque thèse est
            structurée, chaque phase est à vous d&rsquo;ouvrir, chaque instant est jugé
            selon les quatre éléments.
          </p>
        </div>

        <div className="rule mb-5" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
            <Field label="la motion">
              <textarea
                value={motion_}
                onChange={(e) => setMotion(e.target.value)}
                rows={2}
                className="input font-speech text-[15px] leading-snug resize-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SAMPLE_MOTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMotion(m)}
                    className="chip hover:bg-white/10 cursor-pointer text-[10px] py-[2px]"
                  >
                    {m.slice(0, 34)}…
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="proposition">
                <input
                  value={proName}
                  onChange={(e) => setProName(e.target.value)}
                  className="input font-display text-lg"
                  style={{ borderColor: "rgba(168,172,178,0.3)" }}
                />
              </Field>
              <Field label="opposition">
                <input
                  value={conName}
                  onChange={(e) => setConName(e.target.value)}
                  className="input font-display text-lg"
                  style={{ borderColor: "rgba(179,172,158,0.3)" }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`rythme &middot; ${timing.toFixed(2)}×`}>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={timing}
                  onChange={(e) => setTiming(parseFloat(e.target.value))}
                  className="score w-full mt-3"
                />
              </Field>
              <Field label="méthodologie">
                <div className="input font-display italic text-[15px] text-muted truncate">
                  Oxford (adapté) &middot; 3 v 3 &middot; YMV
                </div>
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="public &amp; ton">
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
                className="input font-speech text-[14px] leading-snug resize-none"
              />
            </Field>

            <Field label="questions du public &middot; une par ligne, six maximum">
              <textarea
                value={questions.join("\n")}
                onChange={(e) =>
                  setQuestions(
                    e.target.value.split("\n").slice(0, 6).map((q) => q.trim())
                  )
                }
                rows={6}
                className="input font-speech text-[14px] leading-snug resize-none"
              />
            </Field>
          </div>
        </div>

        <div className="rule mt-6 mb-4" />

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="font-speech italic text-[12px] text-muted max-w-md leading-snug">
            Chaque discours est discrètement relu selon les règles YMV avant de vous
            parvenir. Vous décidez quand poursuivre, et si une interruption est accordée.
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={start}
            disabled={loading || !motion_.trim()}
            className="btn btn-primary text-[13px] px-7 py-3 font-display uppercase tracking-[0.12em]"
          >
            {loading ? "Préparation…" : "Ouvrir la chambre"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const isString = typeof label === "string";
  return (
    <label className="block">
      {isString ? (
        <div
          className="font-display italic text-[11px] text-muted mb-1.5 uppercase tracking-[0.1em]"
          dangerouslySetInnerHTML={{ __html: label as string }}
        />
      ) : (
        <div className="font-display italic text-[11px] text-muted mb-1.5 uppercase tracking-[0.1em]">{label}</div>
      )}
      {children}
    </label>
  );
}
