import { motion } from "framer-motion";
import { useState } from "react";
import { login, registerUser } from "../lib/auth";
import { useStore } from "../lib/store";

export function AuthScreen() {
  const { setUsername, setRoute } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const fn = mode === "login" ? login : registerUser;
      const u = await fn(username.trim(), password);
      setUsername(u);
      setRoute("dashboard");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="surface-soft max-w-md w-full p-8 grain relative"
      >
        <div className="text-center mb-7">
          <span className="chip chip-accent mb-3">entrée de la chambre</span>
          <h1 className="font-display text-4xl hero-title tracking-tight leading-[1.05]">
            {mode === "login" ? "Se connecter" : "Créer un compte"}
          </h1>
          <p className="mt-3 font-speech italic text-[13px] text-muted leading-relaxed">
            {mode === "login"
              ? "Retrouvez vos débats enregistrés et reprenez là où vous étiez."
              : "Vos débats seront liés à votre pseudo et conservés d\u2019une séance à l\u2019autre."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <div className="font-display italic text-[11px] text-muted mb-1.5 uppercase tracking-[0.1em]">
              pseudo
            </div>
            <input
              autoFocus
              value={username}
              onChange={(e) => setU(e.target.value)}
              className="input font-body text-[15px]"
              placeholder="hamid"
              minLength={3}
              required
            />
          </label>
          <label className="block">
            <div className="font-display italic text-[11px] text-muted mb-1.5 uppercase tracking-[0.1em]">
              mot de passe
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setP(e.target.value)}
              className="input font-body text-[15px]"
              placeholder="au moins 6 caractères"
              minLength={6}
              required
            />
          </label>

          {err && (
            <div className="text-[13px] font-speech italic text-red-300 border border-red-500/30 bg-red-500/5 px-3 py-2">
              {err}
            </div>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !username.trim() || password.length < 6}
            className="btn btn-primary w-full justify-center py-3 font-display uppercase tracking-[0.12em] text-[12px]"
          >
            {loading
              ? mode === "login" ? "connexion…" : "création…"
              : mode === "login" ? "Entrer" : "Créer le compte"}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr("");
            }}
            className="font-display italic text-[12px] text-muted hover:text-bone transition-colors"
          >
            {mode === "login"
              ? "pas encore de compte ? en créer un"
              : "déjà inscrit ? se connecter"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
