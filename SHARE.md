# La Chambre du Débat — partager avec un ami

Trois façons de partager l'app, de la plus rapide à la plus portable. Choisis
selon tes contraintes.

---

## Option A — Lui envoyer un zip (macOS + Windows)

Le cas général : tu envoies un dossier compressé, il le dézippe, il double-clique
sur un script, c'est lancé.

### 1. Prépare le zip (toi)

Sur ton Mac, depuis le dossier **parent** du projet :

```bash
cd /Users/chakiblemkhantar/Documents
zip -r gdm_hamid_partage.zip GDM_Hamid \
  -x "*/.venv/*" \
  -x "*/node_modules/*" \
  -x "*/__pycache__/*" \
  -x "*/dist/*" \
  -x "*/.DS_Store" \
  -x "*/users.db" \
  -x "*/debates.db" \
  -x "*/.env"
```

Ce zip ne contient **ni tes clés API, ni ta base de données, ni les deps** —
juste le code + les scripts de lancement.

### 2. Lui envoie le zip

~5 Mo, passe par n'importe quel canal (AirDrop, mail, WeTransfer, Slack…).

Joins-lui aussi ces **deux clés d'API** (sur un canal privé, jamais public) :
- **ANTHROPIC_API_KEY** (commence par `sk-ant-…`)
- **ELEVENLABS_API_KEY** (commence par `sk_…`)

> ⚠ Si tu ne veux pas partager tes clés (facturation sur ton compte), dis-lui
> d'en créer sur <https://console.anthropic.com> et <https://elevenlabs.io/>.

### 3. Lui — pré-requis (à installer une fois)

Il a besoin de **Python ≥ 3.9** et **Node.js ≥ 18** :

**Sur macOS** (terminal) :
```bash
# Installe Homebrew si pas déjà fait :
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python node
```

**Sur Windows** :
- Python : <https://www.python.org/downloads/> (coche bien « Add Python to PATH »)
- Node.js : <https://nodejs.org/> (version LTS)

### 4. Lui — lance l'app

Il dézippe puis, dans le dossier `GDM_Hamid/` :

- **macOS** : double-clic sur `start.sh` *ou* dans un terminal `./start.sh`
- **Windows** : double-clic sur `start.bat`

Au **premier** lancement :
- installe les deps Python et Node (1–2 min)
- ouvre `backend/.env` dans un éditeur → il colle les deux clés API → sauvegarde
- relance `start.sh` / `start.bat`

L'app tourne alors sur <http://localhost:5280>. Ctrl+C (ou fermer les fenêtres
sur Windows) l'arrête.

---

## Option B — Tunnel depuis ta machine (zéro installation pour lui)

Si ton ami n'est pas à l'aise avec un terminal, ou si c'est pour une démo
ponctuelle, tu peux lui donner une URL publique pointant vers ton Mac.

### Avec Cloudflared (le plus simple, gratuit, pas de compte)

Sur ton Mac :

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:5280
```

Il te donne une URL `https://xxxxx.trycloudflare.com`. Envoie-la à ton ami —
il ouvre la page dans n'importe quel navigateur (Mac, Windows, téléphone) et
utilise l'app comme si elle tournait chez lui. Toi tu gardes `start.sh`
en cours côté serveur.

### Avec ngrok (compte gratuit requis)

```bash
brew install ngrok
ngrok http 5280
```

**Limites de cette option :**
- ton Mac doit rester allumé et réveillé
- son quota ElevenLabs/Anthropic passe sur TA carte de crédit
- l'URL change à chaque redémarrage (sauf `cloudflared tunnel` nommé)

---

## Option C — Le plus propre : GitHub privé

Pousse ton code sur un repo GitHub privé, donne-lui accès, il clone :

```bash
git clone https://github.com/toi/gdm-hamid.git
cd gdm-hamid
./start.sh    # ou start.bat sur Windows
```

Avantage : les mises à jour se font par un `git pull` puis relance du script.
Recommandé si tu prévois de continuer à itérer et à lui partager les versions.

---

## Résumé — quel choix ?

| Situation                                     | Option recommandée |
|-----------------------------------------------|--------------------|
| Démo ponctuelle, pas le temps d'expliquer     | **B (tunnel)**     |
| Il va l'utiliser plusieurs fois, seul         | **A (zip)**        |
| Tu veux pouvoir livrer des mises à jour       | **C (git)**        |

## Notes

- Les données (utilisateurs, débats) sont stockées dans `backend/users.db` et
  `backend/debates.db`. Si tu envoies un zip incluant ces fichiers, il hérite
  de tes comptes ; sinon il part d'un état vierge et crée ses propres comptes.
- Le port peut être changé dans `start.sh` / `start.bat` (variable `5280`).
- Sur macOS, si le Gatekeeper bloque `start.sh`, clic-droit → **Ouvrir** la
  première fois.
