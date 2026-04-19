# La Chambre du Débat

Arène interactive Oxford 3-contre-3 où deux agents Claude Opus débattent sous
l'arbitrage d'un modérateur humain. Interface en français, voix en direct via
ElevenLabs, notation selon la grille YMV (4 éléments), persistance SQLite
avec authentification et mode consultation des débats passés.

- **Frontend** : Vite + React + TypeScript + Tailwind + Framer Motion
- **Backend** : FastAPI + LangGraph + Anthropic SDK + WebSocket + SQLite
- **TTS** : ElevenLabs (voix `multilingual v2`)

---

## Lancement rapide

Tu as deux scripts tout-en-un qui installent les dépendances, vérifient la
configuration, et démarrent le backend + le frontend.

### macOS / Linux

```bash
./start.sh
```

### Windows

```
start.bat
```

*(double-clic depuis l'explorateur, ou `start.bat` depuis l'invite de commandes)*

Une fois les deux serveurs lancés, ouvre **<http://localhost:5280>** dans ton
navigateur. Ctrl+C (macOS/Linux) ou fermeture des fenêtres (Windows) arrête
tout.

---

## Pré-requis (à installer une fois)

### macOS

```bash
# Homebrew si besoin
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python et Node
brew install python node
```

Vérifier :
```bash
python3 --version   # >= 3.9
node --version      # >= 18
```

### Windows

1. **Python ≥ 3.9** — <https://www.python.org/downloads/>
   *Coche bien « Add Python to PATH » à l'installation.*
2. **Node.js ≥ 18** — <https://nodejs.org/> (version LTS)

Vérifier dans PowerShell ou `cmd` :
```
python --version
node --version
```

---

## Configuration des clés API

Au premier lancement, les scripts créent `backend/.env` à partir du modèle et
ouvrent le fichier dans ton éditeur par défaut. Tu dois y coller **deux clés** :

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-opus-4-5

ELEVENLABS_API_KEY=sk_...
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVEN_VOICE_PRO=DODLEQrClDo8wCz460ld
ELEVEN_VOICE_CON=nZ5WsS2E2UAALki8m2V6
```

- **ANTHROPIC_API_KEY** : à créer sur <https://console.anthropic.com/settings/keys>
- **ELEVENLABS_API_KEY** : à créer sur <https://elevenlabs.io/app/settings/api-keys>
  (nécessite un abonnement actif pour l'accès à l'API)

Sauvegarde le fichier, puis relance `./start.sh` ou `start.bat`.

---

## Première utilisation

1. Ouvre <http://localhost:5280>.
2. Crée un compte (pseudo ≥ 3 caractères, mot de passe ≥ 6 caractères).
   *Les utilisateurs sont stockés dans `backend/users.db` (bcrypt).*
3. Tu arrives sur ton tableau de bord vide — clique **+ Nouveau débat**.
4. Remplis : motion, nom des équipes, questions du public.
5. **Ouvrir la chambre** → l'arène se charge.
6. **Ouvrir le débat** → le premier orateur se lance.
7. À chaque tour :
   - lis le discours
   - note-le sur les 4 critères YMV (Contenu / Réfutation / Structure / Style)
   - clique **▸ écouter** pour entendre la voix ElevenLabs
   - édite le discours si tu veux le corriger (`✎ éditer`) — ta version devient
     la référence pour les prochains orateurs
   - **Orateur suivant** pour enchaîner
8. Après les 16 tours, **Rendre le verdict**.

---

## Raccourcis

| Objectif                         | Comment                                                   |
|----------------------------------|-----------------------------------------------------------|
| Voix auto sur chaque discours    | chip **◉ voix** dans le pupitre du modérateur             |
| Revoir un tour précédent         | clic sur son tag (`P1`, `O2`, `P3-Final`…) dans l'ordre   |
| Revenir au direct                | chip **⟲ au direct**                                      |
| Accorder un Point d'Information  | bouton **Interrompre** → choisir le côté                  |
| Consulter un débat terminé       | tableau de bord → **consulter**                          |
| Supprimer un débat               | tableau de bord → **supprimer**                          |

---

## Accès depuis un autre appareil du réseau local

Les deux serveurs écoutent sur toutes les interfaces (`0.0.0.0`).

- Sur macOS, trouve ton IP : `ipconfig getifaddr en0` (ex. `192.168.1.42`)
- Sur Windows : `ipconfig` (cherche « IPv4 »)

Depuis ton téléphone ou un autre ordi sur le même Wi-Fi, ouvre
**http://&lt;ton-ip&gt;:5280**. L'URL s'affiche aussi automatiquement dans la
console quand tu lances `./start.sh`.

Si le pare-feu bloque : autorise Node / Python à accepter les connexions
entrantes dans Réglages Système → Réseau → Pare-feu (macOS) ou Pare-feu
Windows Defender (Windows).

---

## Mise en place manuelle (sans les scripts)

Si tu préfères piloter toi-même :

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # macOS/Linux
# .venv\Scripts\activate.bat       # Windows
pip install -r requirements.txt
cp .env.example .env               # puis remplis les clés
python -m uvicorn main:app --host 0.0.0.0 --port 8787
```

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev -- --host --port 5280
```

---

## Structure du projet

```
GDM_Hamid/
├── start.sh · start.bat           # lanceurs tout-en-un
├── SHARE.md                       # guide pour partager l'app avec un ami
├── CLAUDE.md                      # notes d'architecture
├── docs/
│   ├── OXFORD_FORMAT.md           # règles du format 3v3 adapté
│   └── DEBATER_MANUAL.md          # manuel YMV condensé (CEEL, rubrique 4-éléments…)
├── backend/
│   ├── main.py                    # FastAPI + routes + WebSocket
│   ├── agents.py                  # agents LangGraph (débateurs + relecteur)
│   ├── prompts.py                 # prompts système en français
│   ├── auth.py                    # SQLite users + bcrypt + JWT
│   ├── db.py                      # SQLite debates (snapshot JSON)
│   ├── requirements.txt
│   └── .env.example               # modèle de configuration
└── frontend/
    ├── public/logo.png
    ├── src/
    │   ├── App.tsx                # router (auth → dashboard → setup → arena)
    │   ├── components/            # AuthScreen, Dashboard, DebateArena, DebaterPanel, …
    │   └── lib/                   # api, auth, store (zustand), tts, types
    ├── package.json
    └── vite.config.ts             # proxy /api + /ws → backend :8787
```

---

## Dépannage

**`./start.sh: Permission denied`** *(macOS)*
```bash
chmod +x start.sh
```

**Gatekeeper bloque `start.sh`** *(macOS)*
Clic-droit sur `start.sh` → **Ouvrir** la première fois.

**Port 5280 ou 8787 déjà utilisé**
Modifie la variable de port dans `start.sh` / `start.bat` (frontend = 5280,
backend = 8787) puis aussi le proxy dans `frontend/vite.config.ts` si tu
changes celui du backend.

**`The play() request was interrupted…`** *(TTS)*
Bug connu : rechargeabi le statut — le nouveau singleton TTS crée un audio
neuf par lecture pour éviter ces collisions. Si ça persiste, coupe le toggle
« voix » et relance en manuel.

**ElevenLabs répond `401 payment_issue`**
L'abonnement ElevenLabs a une facture impayée. Règle-la sur
<https://elevenlabs.io/app/subscription>.

**Je veux repartir de zéro (effacer tous les comptes et débats)**
```bash
rm backend/users.db backend/debates.db
```

---

## Partage

Pour envoyer l'app à un ami, voir **[SHARE.md](SHARE.md)** — trois options
(zip, tunnel Cloudflare, GitHub privé).
