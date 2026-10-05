#!/usr/bin/env bash
# Crea un proyecto nuevo que usa el Guardián (ADR 0021): primero revisa qué falta (Paso 0) y pide las llaves;
# recién con todo listo crea el sitio, el repo, los secretos, sube el esqueleto y configura protecciones.
# Así ningún workflow corre sin llaves.
#
# Uso:  scripts/nuevo-proyecto.sh <nombre-del-repo> [--revisar]
#   --revisar   solo el Paso 0: dice qué hay y qué falta, sin crear nada.
# Se puede volver a correr: salta lo que ya existe.
# Los tokens se escriben ocultos y van directo a GitHub Secrets; no se guardan en disco.
set -euo pipefail

SLUG="${1:-}"
MODO="${2:-}"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Uso: $0 <nombre-del-repo en minúsculas-con-guiones> [--revisar]"; exit 2; }

GUARDIAN=jjhoncv/guardian
SKELETON=jjhoncv/guardian-skeleton
DIR_SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
DESTINO="${DESTINO:-$HOME/Projects}/$SLUG"

ok()    { printf '  ✅ %s\n' "$1"; }
falta() { printf '  ❌ %s\n' "$1"; FALTAN=$((FALTAN + 1)); }
info()  { printf '  •  %s\n' "$1"; }
titulo(){ printf '\n== %s\n' "$1"; }

# "lista-de-lecturas" → "Lista de lecturas"
NOMBRE=$(echo "$SLUG" | tr '-' ' ' | awk '{ $1 = toupper(substr($1,1,1)) substr($1,2); print }')

# ───────────────────────── Paso 0: qué hay y qué falta ─────────────────────────
titulo "Paso 0 · Revisión (no crea nada)"
FALTAN=0
for c in gh git jq curl; do command -v "$c" >/dev/null && ok "$c instalado" || falta "$c no está instalado"; done
if gh auth status >/dev/null 2>&1; then
  OWNER=$(gh api user -q .login)
  ok "gh con sesión: $OWNER"
  SCOPES=$(gh auth status 2>&1 | grep -i 'token scopes' || true)
  for s in repo workflow project; do
    echo "$SCOPES" | grep -q "'$s'" && ok "permiso de gh: $s" || falta "permiso de gh: $s  →  en otra terminal: gh auth refresh -h github.com -s $s"
  done
else
  falta "gh sin sesión  →  gh auth login"
  OWNER="?"
fi
REPO="$OWNER/$SLUG"
SITIO="$SLUG-$OWNER"
VERSION=$(gh release view -R "$GUARDIAN" --json tagName -q .tagName 2>/dev/null || true)
if [ -z "$VERSION" ]; then falta "no se encontró un release de $GUARDIAN"
elif gh api "repos/$GUARDIAN/contents/.github/workflows/guardian-ci.yml?ref=$VERSION" >/dev/null 2>&1; then ok "versión del Guardián a usar: $VERSION"
else falta "el último release del Guardián ($VERSION) no tiene los workflows reutilizables: publica uno nuevo"; fi
gh repo view "$SKELETON" >/dev/null 2>&1 && ok "esqueleto disponible: $SKELETON" || falta "no existe $SKELETON"

EXISTE_REPO=no; VACIO=si; HAY_SITIO=no; HAY_TOKEN_NETLIFY=no; HAY_PAT=no
if gh repo view "$REPO" >/dev/null 2>&1; then
  EXISTE_REPO=si
  gh api "repos/$REPO/commits?per_page=1" >/dev/null 2>&1 && VACIO=no
  SECRETOS=$(gh secret list -R "$REPO" 2>/dev/null | cut -f1)
  echo "$SECRETOS" | grep -qx NETLIFY_AUTH_TOKEN && HAY_TOKEN_NETLIFY=si
  echo "$SECRETOS" | grep -qx RELEASE_PLEASE_TOKEN && HAY_PAT=si
  SITE_ID=$(gh variable get NETLIFY_SITE_ID -R "$REPO" 2>/dev/null || true)
  [ -n "$SITE_ID" ] && HAY_SITIO=si
  if [ "$VACIO" = no ] && ! gh api "repos/$REPO/contents/.github/workflows/ci.yml" -q .content 2>/dev/null | base64 -d 2>/dev/null | grep -q "$GUARDIAN/.github/workflows/"; then
    falta "el repo $REPO ya tiene código que no viene de guardian-skeleton: usa otro nombre o bórralo"
  else
    info "el repo $REPO ya existe (con código: $([ "$VACIO" = no ] && echo sí || echo no)) → se retoma donde quedó"
  fi
else
  info "el repo $REPO no existe → se crea"
fi

titulo "Lo que te voy a pedir (los tokens se escriben ocultos)"
printf '  %-22s %-46s %s\n' "Qué" "Dónde se saca" "Empieza con"
[ "$HAY_TOKEN_NETLIFY" = si ] && [ "$HAY_SITIO" = si ] \
  && info "Token de Netlify: ya está en el repo" \
  || printf '  %-22s %-46s %s\n' "Token de Netlify" "Netlify → avatar → User settings → Applications" "nfp_"
[ "$HAY_PAT" = si ] \
  && info "PAT de release-please: ya está en el repo" \
  || printf '  %-22s %-46s %s\n' "PAT (solo este repo)" "GitHub → Settings → Developer settings → Fine-grained" "github_pat_"
info "El sitio de Netlify ($SITIO) lo crea el script con tu token."

if [ "$FALTAN" -gt 0 ]; then
  printf '\nFaltan %s requisito(s). Resuélvelos y vuelve a correr el script.\n' "$FALTAN"; exit 1
fi
[ "$MODO" = "--revisar" ] && { printf '\nTodo listo para crear «%s». Corre el script sin --revisar.\n' "$NOMBRE"; exit 0; }

printf '\nSe va a crear «%s» en %s, con el Guardián %s. ¿Seguimos? [s/N] ' "$NOMBRE" "$REPO" "$VERSION"
read -r RESP; [[ "$RESP" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }

# ───────────────────────── 1. Netlify: token y sitio ─────────────────────────
if [ "$HAY_SITIO" = si ] && [ "$HAY_TOKEN_NETLIFY" = si ]; then
  titulo "1 · Netlify: ya configurado (sitio $SITE_ID)"
else
  titulo "1 · Netlify"
  while :; do
    read -rsp "  Pega el token de Netlify (nfp_…, no se ve al escribir): " TOKEN_NETLIFY; echo
    CUENTA=$(curl -fsS -H "Authorization: Bearer $TOKEN_NETLIFY" https://api.netlify.com/api/v1/user 2>/dev/null | jq -r '.email // empty' || true)
    [ -n "$CUENTA" ] && { ok "token válido ($CUENTA)"; break; } || echo "  ❌ Netlify rechazó ese token. Prueba de nuevo."
  done
  SITE_ID=$(curl -fsS -H "Authorization: Bearer $TOKEN_NETLIFY" "https://api.netlify.com/api/v1/sites?name=$SITIO&filter=all" \
    | jq -r --arg n "$SITIO" '[.[] | select(.name == $n)][0].id // empty')
  if [ -n "$SITE_ID" ]; then
    ok "sitio existente reutilizado: $SITIO"
  else
    SITE_ID=$(curl -fsS -X POST -H "Authorization: Bearer $TOKEN_NETLIFY" -H 'Content-Type: application/json' \
      -d "{\"name\":\"$SITIO\"}" https://api.netlify.com/api/v1/sites | jq -r .id)
    ok "sitio creado: https://$SITIO.netlify.app"
  fi
fi

# ───────────────────────── 2. Repo vacío ─────────────────────────
titulo "2 · Repo"
if [ "$EXISTE_REPO" = si ]; then ok "$REPO ya existe"
else gh repo create "$REPO" --public --description "Proyecto creado con el Guardián" >/dev/null && ok "creado: https://github.com/$REPO"; fi

# ───────────────────────── 3. Secreto y variable de Netlify ─────────────────────────
titulo "3 · Secretos de Netlify"
if [ "$HAY_TOKEN_NETLIFY" = si ] && [ "$HAY_SITIO" = si ]; then ok "ya estaban"
else
  printf '%s' "$TOKEN_NETLIFY" | gh secret set NETLIFY_AUTH_TOKEN -R "$REPO" && ok "NETLIFY_AUTH_TOKEN guardado"
  gh variable set NETLIFY_SITE_ID -R "$REPO" --body "$SITE_ID" && ok "NETLIFY_SITE_ID = $SITE_ID"
  unset TOKEN_NETLIFY
fi

# ───────────────────────── 4. PAT de release-please ─────────────────────────
titulo "4 · PAT de release-please (uno por proyecto, ADR 0011)"
if [ "$HAY_PAT" = si ]; then ok "ya estaba"
else
  cat <<TXT
  Crea un token en https://github.com/settings/personal-access-tokens/new
    • Token name: release-please-$SLUG      • Expiration: 90 días
    • Repository access: Only select repositories → $SLUG
    • Permissions → Repository: Contents = Read and write, Pull requests = Read and write
TXT
  while :; do
    read -rsp "  Pega el PAT (github_pat_…, no se ve al escribir): " PAT; echo
    PUEDE=$(curl -fsS -H "Authorization: Bearer $PAT" "https://api.github.com/repos/$REPO" 2>/dev/null | jq -r '.permissions.push // false' || echo false)
    [ "$PUEDE" = true ] && { ok "el PAT tiene acceso de escritura a $REPO"; break; } \
      || echo "  ❌ Ese PAT no puede escribir en $REPO (¿elegiste el repo y los permisos?). Prueba de nuevo."
  done
  printf '%s' "$PAT" | gh secret set RELEASE_PLEASE_TOKEN -R "$REPO" && ok "RELEASE_PLEASE_TOKEN guardado"
  unset PAT
fi

# ───────────────────────── 5. Código: el esqueleto ─────────────────────────
titulo "5 · Código"
if [ "$VACIO" = no ]; then ok "el repo ya tiene código"
else
  TMP=$(mktemp -d)
  git clone -q --depth 1 "https://github.com/$SKELETON.git" "$TMP/p" && rm -rf "$TMP/p/.git"
  # Lo propio del esqueleto (su validación y su README) no va al proyecto.
  rm -rf "$TMP/p/.github/workflows" "$TMP/p/ESQUELETO.md"
  mv "$TMP/p/.github/workflows-proyecto" "$TMP/p/.github/workflows"
  grep -rl '__\(NOMBRE\|SLUG\|REPO\|SITIO\|GUARDIAN\)__' "$TMP/p" | while read -r f; do
    sed -i.bak -e "s|__NOMBRE__|$NOMBRE|g" -e "s|__SLUG__|$SLUG|g" -e "s|__REPO__|$REPO|g" \
               -e "s|__SITIO__|$SITIO|g" -e "s|__GUARDIAN__|$VERSION|g" "$f" && rm -f "$f.bak"
  done
  git -C "$TMP/p" init -q -b main
  git -C "$TMP/p" add -A
  git -C "$TMP/p" commit -q -m "chore: crea $SLUG con el Guardián $VERSION (guardian-skeleton)"
  git -C "$TMP/p" push -q "$(gh repo view "$REPO" --json sshUrl -q .sshUrl)" main
  rm -rf "$TMP"
  ok "esqueleto subido (los workflows ya corren con las llaves puestas)"
fi
if [ -d "$DESTINO" ]; then info "carpeta local ya existe: $DESTINO"
else gh repo clone "$REPO" "$DESTINO" -- -q && ok "clonado en $DESTINO"; fi

# ───────────────────────── 6. Protecciones y tablero ─────────────────────────
titulo "6 · Protecciones, seguridad y tablero"
"$DIR_SCRIPTS/configurar-repo.sh" "$REPO" "$OWNER" | sed 's/^/  /'

# ───────────────────────── 7. Verificación ─────────────────────────
titulo "7 · Verificación (puede tardar unos minutos)"
STAGING="https://staging--$SITIO.netlify.app"
for _ in $(seq 1 60); do
  H1=$(curl -fsS "$STAGING" 2>/dev/null | grep -o '<h1>[^<]*</h1>' | head -1 || true)
  [ "$H1" = "<h1>$NOMBRE</h1>" ] && break
  sleep 15
done
[ "$H1" = "<h1>$NOMBRE</h1>" ] && ok "staging muestra «$NOMBRE»: $STAGING" || info "staging aún no responde; revisa Actions → Deploy en https://github.com/$REPO/actions"
EN_ROJO=$(gh run list -R "$REPO" --limit 20 --json conclusion -q '[.[] | select(.conclusion=="failure")] | length')
[ "$EN_ROJO" = 0 ] && ok "sin runs en rojo" || info "$EN_ROJO run(s) en rojo: https://github.com/$REPO/actions"

titulo "Listo: «$NOMBRE»"
cat <<TXT
  Repo:       https://github.com/$REPO
  Staging:    $STAGING
  Producción: https://$SITIO.netlify.app  (con el primer release que apruebes)

  Siguientes pasos:
  1. Tablero (una vez): Projects → $SLUG → ⋯ → Workflows → Auto-add to project → filtro is:issue is:open → Save and turn on.
  2. Abre Claude Code en $DESTINO y corre /planificar.
TXT
