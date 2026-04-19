import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import type { Side } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VerdictModal({ open, onClose }: Props) {
  const { moderatorScores, transcript, debate } = useStore();
  const session = debate;
  const [winner, setWinner] = useState<Side | null>(null);
  const [rationale, setRationale] = useState("");

  const totals = useMemo(() => {
    const acc = { proposition: 0, opposition: 0 };
    const n = { proposition: 0, opposition: 0 };
    for (const s of moderatorScores) {
      const turn = transcript.find((t) => t.index === s.turn_index);
      if (!turn) continue;
      const sum = s.content + s.refutation + s.structure + s.style;
      const mapped = 65 + (sum / 100) * 20;
      acc[turn.side] += mapped;
      n[turn.side] += 1;
    }
    return {
      pro: n.proposition ? acc.proposition / n.proposition : 0,
      con: n.opposition ? acc.opposition / n.opposition : 0,
      pro_n: n.proposition,
      con_n: n.opposition,
    };
  }, [moderatorScores, transcript]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="surface-soft max-w-2xl w-full p-10 grain relative"
      >
        <div className="text-center">
          <span className="chip chip-accent mb-5">le modérateur prend la parole</span>
          <h2 className="font-display text-5xl hero-title leading-tight">Votre verdict final</h2>
          <p className="mt-4 font-speech italic text-muted max-w-md mx-auto text-[15px] leading-relaxed">
            À partir des feuilles de jugement tenues tout au long de la soirée,
            désignez le camp qui a emporté la salle.
          </p>
        </div>

        <div className="my-8 grid grid-cols-2 gap-4">
          <VerdictCard
            side="proposition"
            name={session?.pro_team_name || "Proposition"}
            mean={totals.pro}
            n={totals.pro_n}
            selected={winner === "proposition"}
            onSelect={() => setWinner("proposition")}
          />
          <VerdictCard
            side="opposition"
            name={session?.con_team_name || "Opposition"}
            mean={totals.con}
            n={totals.con_n}
            selected={winner === "opposition"}
            onSelect={() => setWinner("opposition")}
          />
        </div>

        <textarea
          placeholder="Quelques phrases — ce qui a fait pencher votre décision…"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          className="input font-speech italic text-[15px] leading-relaxed"
        />

        <div className="mt-6 flex justify-between items-center">
          <button onClick={onClose} className="btn">fermer</button>
          {winner && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`chip ${winner === "proposition" ? "chip-pro" : "chip-con"} text-sm px-4 py-2`}
            >
              la soirée revient à {winner === "proposition" ? session?.pro_team_name : session?.con_team_name}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VerdictCard({
  side, name, mean, n, selected, onSelect,
}: {
  side: Side; name: string; mean: number; n: number; selected: boolean; onSelect: () => void;
}) {
  const isPro = side === "proposition";
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className="p-5 text-left relative overflow-hidden border transition-colors"
      style={{
        borderColor: selected
          ? (isPro ? "rgba(168,172,178,0.7)" : "rgba(179,172,158,0.7)")
          : "rgba(244,241,232,0.1)",
        background: selected
          ? (isPro ? "rgba(168,172,178,0.08)" : "rgba(179,172,158,0.08)")
          : "rgba(244,241,232,0.02)",
      }}
    >
      <span className={`chip ${isPro ? "chip-pro" : "chip-con"} mb-3`}>
        {isPro ? "proposition" : "opposition"}
      </span>
      <div className="font-display text-2xl leading-tight">{name}</div>
      <div className="mt-5 flex items-baseline gap-2">
        <div className="font-display text-4xl numeral">{mean ? mean.toFixed(1) : "—"}</div>
        <div className="font-display italic text-[12px] text-muted">moyenne sur 85</div>
      </div>
      <div className="font-display italic text-[11px] text-faint mt-1">
        sur {n} tour{n === 1 ? "" : "s"} noté{n === 1 ? "" : "s"}
      </div>
    </motion.button>
  );
}
