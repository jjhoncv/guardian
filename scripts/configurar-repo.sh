#!/usr/bin/env bash
# Aplica la configuración del repo que no vive en archivos (protecciones, environments, seguridad).
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

echo "→ Seguridad: secret scanning, push protection, alertas y parches de Dependabot"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null

echo "→ GITHUB_TOKEN de solo lectura por defecto; Actions no puede aprobar PRs"
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null

echo "→ Ruleset de main: PR obligatorio (0 aprobaciones en Fase 1, ADR 0009) + CI en verde; sin push directo, force push ni borrado"
RULESET_ID=$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name == "main") | .id')
RULESET=$(cat <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "lint, typecheck, pruebas y build", "integration_id": 15368 } ] } }
  ]
}
JSON
)
if [ -n "$RULESET_ID" ]; then
  echo "$RULESET" | gh api -X PUT "repos/$REPO/rulesets/$RULESET_ID" --input - >/dev/null
else
  echo "$RULESET" | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
fi

echo "✓ Listo"
