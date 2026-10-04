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

echo "✓ Listo"
