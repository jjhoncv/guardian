#!/usr/bin/env bash
# Rollback de producción en Netlify al deploy anterior y un issue `alerta` (sección 8, D4).
# Lo usan Guardián · Release y Smoke test. Variables: NETLIFY_BIN, NETLIFY_AUTH_TOKEN, SITIO, URL, RUN,
# GH_TOKEN, GITHUB_REPOSITORY.
set -uo pipefail

api() { "$NETLIFY_BIN" api "$1" --data "$2"; }

ACTUAL=$(api getSite "{\"site_id\":\"$SITIO\"}" | jq -r '.published_deploy.id')
ANTERIOR=$(api listSiteDeploys "{\"site_id\":\"$SITIO\",\"production\":true,\"state\":\"ready\",\"per_page\":20}" \
  | jq -r --arg a "$ACTUAL" '[.[] | select(.id != $a)] | sort_by(.created_at) | reverse | .[0].id // empty')

if [ -n "$ANTERIOR" ] && api restoreSiteDeploy "{\"site_id\":\"$SITIO\",\"deploy_id\":\"$ANTERIOR\"}" > /dev/null; then
  ESTADO="Producción **volvió al deploy anterior** (\`$ANTERIOR\`); el deploy que falló es \`$ACTUAL\`."
  RESULTADO=0
else
  ESTADO="⚠️ **El rollback automático falló**: producción puede estar rota. Hazlo a mano en Netlify → Deploys → deploy anterior → *Publish deploy*."
  RESULTADO=1
fi

gh label create alerta --color B60205 --description "Alerta automática del Guardián" -R "$GITHUB_REPOSITORY" 2>/dev/null || true
gh issue create -R "$GITHUB_REPOSITORY" --label alerta \
  --title "Alerta: falló el smoke test de producción" \
  --body "$(printf 'El smoke test falló contra %s.\n\n%s\n\nRun: %s\n\n**Escenario:** E1 — Proyecto nuevo en producción el día 1 (producción sana)' "$URL" "$ESTADO" "$RUN")"
exit $RESULTADO
