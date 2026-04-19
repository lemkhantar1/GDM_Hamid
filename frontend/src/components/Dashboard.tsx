import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  deleteDebate,
  fetchPhases,
  getDebate,
  listDebates,
  type DebateSummary,
} from "../lib/api";
import { clearAuth } from "../lib/auth";
import { useStore } from "../lib/store";

export function Dashboard() {
  const { username, setRoute, setPhases, openDebate, logout } = useStore();
  const [items, setItems] = useState<DebateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [rows, phases] = await Promise.all([listDebates(), fetchPhases()]);
      setItems(rows);
      setPhases(phases);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function open(id: string, mode: "arena" | "view") {
    try {
      const rec = await getDebate(id);
      openDebate(rec, mode);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function remove(id: string) {
    try {
      await deleteDebate(id);
      setConfirmDelete(null);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col items-center p-6">
      <div className="max-w-[1100px] w-full flex items-center justify-between mb-6">
        <div>
          <span className="chip chip-accent mb-1">votre bibliothèque</span>
          <h1 className="font-display text-3xl hero-title leading-tight">Vos débats</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display italic text-[11px] text-muted uppercase tracking-[0.12em]">connecté en tant que</div>
            <div className="font-display text-[15px] text-bone">{username}</div>
          </div>
          <button
            onClick={() => { clearAuth(); logout(); }}
            className="btn text-[11px] font-display italic"
          >
            déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-speech italic text-[13px] text-muted">
            {loading ? "chargement…" : `${items.length} débat${items.length === 1 ? "" : "s"} enregistré${items.length === 1 ? "" : "s"}`}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRoute("setup")}
            className="btn btn-primary font-display uppercase tracking-[0.1em] text-[12px]"
          >
            + Nouveau débat
          </motion.button>
        </div>

        {err && (
          <div className="surface-soft p-4 text-[13px] font-speech italic text-red-300">
            {err}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="surface-soft p-10 text-center grain">
            <div className="font-display text-2xl mb-2">Pas encore de débat.</div>
            <div className="font-speech italic text-muted text-[14px]">
              Ouvrez-en un pour commencer — il sera sauvegardé automatiquement au fil des tours.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {items.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="surface-soft p-4 grain relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg leading-snug line-clamp-2">{d.motion}</div>
                    <div className="mt-1 font-display italic text-[12px] text-muted">
                      <span className="text-pro-300">{d.pro_team_name}</span>
                      <span className="text-faint"> contre </span>
                      <span className="text-con-300">{d.con_team_name}</span>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="mt-3 flex items-center gap-2 font-display italic text-[11px] text-muted">
                  <span className="numeral">{d.current_index} / {d.total_phases}</span>
                  <span className="text-faint">·</span>
                  <span>{relativeTime(d.updated_at)}</span>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {d.status !== "completed" && (
                    <button
                      onClick={() => open(d.id, "arena")}
                      className="btn btn-primary text-[11px] font-display uppercase tracking-[0.1em]"
                    >
                      {d.current_index === 0 ? "Ouvrir" : "Reprendre"}
                    </button>
                  )}
                  <button
                    onClick={() => open(d.id, "view")}
                    className="btn text-[11px] font-display italic"
                  >
                    consulter
                  </button>
                  <button
                    onClick={() => setConfirmDelete(d.id)}
                    className="btn text-[11px] font-display italic ml-auto"
                    style={{ borderColor: "rgba(224,122,99,0.35)", color: "#f0a58f" }}
                  >
                    supprimer
                  </button>
                </div>

                {confirmDelete === d.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 p-4 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
                  >
                    <div className="font-speech italic text-[14px] text-bone mb-3 text-center">
                      Supprimer ce débat ? L&rsquo;action est irréversible.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)} className="btn text-[11px]">
                        annuler
                      </button>
                      <button
                        onClick={() => remove(d.id)}
                        className="btn text-[11px] font-display uppercase tracking-[0.1em]"
                        style={{ borderColor: "rgba(224,122,99,0.6)", color: "#f0a58f" }}
                      >
                        confirmer
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed" ? "chip chip-accent" :
    status === "running"   ? "chip chip-pro"    :
    "chip";
  const label =
    status === "completed" ? "terminé" :
    status === "running"   ? "en cours" :
    "à ouvrir";
  return <span className={cls}>{label}</span>;
}

function relativeTime(t: number): string {
  if (!t) return "à l\u2019instant";
  const s = Math.max(0, Date.now() / 1000 - t);
  if (s < 60) return "à l\u2019instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
