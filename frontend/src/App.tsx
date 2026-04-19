import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { Dashboard } from "./components/Dashboard";
import { DebateArena } from "./components/DebateArena";
import { SetupScreen } from "./components/SetupScreen";
import { VFXBackground } from "./components/VFXBackground";
import { verifyAuth } from "./lib/auth";
import { useStore } from "./lib/store";

export function App() {
  const { route, setUsername, setRoute, username } = useStore();
  const [bootstrapped, setBootstrapped] = useState(false);

  // On mount: verify any stored token and decide where to land.
  useEffect(() => {
    (async () => {
      const u = await verifyAuth();
      if (u) {
        setUsername(u);
        setRoute("dashboard");
      } else {
        setRoute("auth");
      }
      setBootstrapped(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let content: React.ReactNode = null;
  if (!bootstrapped) {
    content = <Splash />;
  } else if (!username || route === "auth") {
    content = <AuthScreen />;
  } else if (route === "dashboard") {
    content = <Dashboard />;
  } else if (route === "setup") {
    content = <SetupScreen />;
  } else if (route === "arena" || route === "view") {
    content = <DebateArena />;
  }

  return (
    <>
      <VFXBackground />
      {content}
    </>
  );
}

function Splash() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="font-display italic text-muted text-sm">chargement…</div>
    </div>
  );
}
