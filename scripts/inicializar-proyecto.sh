#!/usr/bin/env bash
# Convierte una copia de la plantilla Guardián en un proyecto propio (ADR 0016).
# Lo corre el workflow "Inicializar proyecto"; también sirve a mano.
# Uso: scripts/inicializar-proyecto.sh <dueño/repo>
# Corre una sola vez: la marca es que exista docs/PROYECTO.ejemplo.md.
set -euo pipefail

REPO="${1:?Uso: $0 <dueño/repo>}"
SLUG="${REPO#*/}"

if [ ! -f docs/PROYECTO.ejemplo.md ]; then
  echo "Ya inicializado (no existe docs/PROYECTO.ejemplo.md); nada que hacer."
  exit 0
fi

# "lista-de-lecturas" → "Lista de lecturas"
NOMBRE=$(echo "$SLUG" | tr '_-' '  ' | awk '{ $1 = toupper(substr($1,1,1)) substr($1,2); print }')
echo "→ Inicializando «${NOMBRE}» (${REPO})"

# Alcance, instrucciones para Claude y README propios, desde los ejemplos.
sed -e "1s/.*/# $NOMBRE/" -e '/^> Copia este archivo/d' docs/PROYECTO.ejemplo.md > PROYECTO.md
sed -e "s/<Nombre del proyecto>/$NOMBRE/g" -e '/^<!-- Copia este archivo/{N;d;}' docs/CLAUDE.ejemplo.md > CLAUDE.md
sed -e "s|__NOMBRE__|$NOMBRE|g" -e "s|__REPO__|$REPO|g" docs/README.ejemplo.md > README.md
rm docs/PROYECTO.ejemplo.md docs/CLAUDE.ejemplo.md docs/README.ejemplo.md

# Historia del Guardián: el proyecto genera la suya desde 0.1.0.
rm -f CHANGELOG.md
echo '{ ".": "0.0.0" }' > .release-please-manifest.json
for f in package.json package-lock.json; do
  jq --arg n "$SLUG" '.name = $n | .version = "0.0.0" | if .packages then .packages[""].name = $n | .packages[""].version = "0.0.0" else . end' "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done

# Decisiones: se queda la plantilla de ADR; las del Guardián se enlazan, no se copian.
find docs/decisiones -name '0*.md' ! -name '0000-plantilla.md' -delete
cat > docs/decisiones/README.md <<MD
# Decisiones (ADR)

Una ADR corta por decisión: qué se decidió y por qué. Copia \`0000-plantilla.md\` con el siguiente número.

Las decisiones heredadas de la plantilla (stack, ramas, Netlify, releases) están en el [Guardián](https://github.com/jjhoncv/guardian/tree/main/docs/decisiones).

| # | Decisión | Estado |
|---|---|---|
MD

echo "✓ Listo. Revisa PROYECTO.md, CLAUDE.md y README.md y completa lo que está entre < >."
