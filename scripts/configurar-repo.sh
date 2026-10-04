#!/usr/bin/env bash
# Aplica la configuración del repo que no vive en archivos (protecciones, environments).
# Uso: scripts/configurar-repo.sh <dueño/repo> <usuario-revisor>
# Requiere `gh` con sesión de un admin del repo. Es idempotente.
set -euo pipefail

REPO="${1:?Uso: $0 <dueño/repo> <usuario-revisor>}"
REVISOR="${2:?Uso: $0 <dueño/repo> <usuario-revisor>}"
REVISOR_ID=$(gh api "users/$REVISOR" --jq .id)

echo "→ Environment production: aprobación obligatoria de $REVISOR, solo desde main"
gh api -X PUT "repos/$REPO/environments/production" --input - <<JSON >/dev/null
{
  "reviewers": [{ "type": "User", "id": $REVISOR_ID }],
  "prevent_self_review": false,
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
gh api -X POST "repos/$REPO/environments/production/deployment-branch-policies" \
  -f name=main -f type=branch >/dev/null 2>&1 || true

echo "→ Merge: solo squash, con el título del PR como mensaje (ADR 0013); borra la rama al hacer merge"
gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY \
  -F delete_branch_on_merge=true >/dev/null

echo "✓ Listo"
