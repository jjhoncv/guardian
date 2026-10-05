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

echo "→ Merge: solo squash, con el título del PR como mensaje; borra la rama al hacer merge"
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

echo "→ Ruleset de main: PR obligatorio (0 aprobaciones: el dueño hace el merge) + CI y chequeo del PR en verde; sin push directo, force push ni borrado"
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
          { "context": "lint, typecheck, pruebas y build", "integration_id": 15368 },
          { "context": "ticket y escenario", "integration_id": 15368 } ] } }
  ]
}
JSON
)
if [ -n "$RULESET_ID" ]; then
  echo "$RULESET" | gh api -X PUT "repos/$REPO/rulesets/$RULESET_ID" --input - >/dev/null
else
  echo "$RULESET" | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
fi

echo "→ Tablero de GitHub Projects (requiere el permiso 'project' en gh)"
OWNER="${REPO%%/*}"
TITULO="${REPO#*/}"
NUM=$(gh project list --owner "$OWNER" --format json --limit 100 --jq ".projects[] | select(.title == \"$TITULO\") | .number")
if [ -z "$NUM" ]; then
  NUM=$(gh project create --owner "$OWNER" --title "$TITULO" --format json --jq .number)
fi
gh project link "$NUM" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || true
# Columnas en español. Se renombran las opciones por defecto conservando su id, para que las
# automatizaciones de GitHub (issue cerrado / PR fusionado → "Done") sigan apuntando a "Hecho".
CAMPOS=$(gh project field-list "$NUM" --owner "$OWNER" --format json)
STATUS_ID=$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$CAMPOS")
op() { jq -r --arg a "$1" --arg b "$2" '.fields[] | select(.name == "Status") | .options[] | select(.name == $a or .name == $b) | .id' <<<"$CAMPOS"; }
TODO=$(op Todo "Por hacer"); CURSO=$(op "In Progress" "En curso"); REV=$(op "-" "En revisión"); HECHO=$(op Done Hecho)
opcion() { [ -n "$1" ] && printf '{id: "%s", name: "%s", color: %s, description: "%s"}' "$1" "$2" "$3" "$4" \
                      || printf '{name: "%s", color: %s, description: "%s"}' "$2" "$3" "$4"; }
gh api graphql -f query="mutation { updateProjectV2Field(input: {fieldId: \"$STATUS_ID\", singleSelectOptions: [
  $(opcion "$TODO" "Por hacer" GRAY "Backlog de la fase"),
  $(opcion "$CURSO" "En curso" YELLOW "Rama abierta"),
  $(opcion "$REV" "En revisión" BLUE "PR esperando al dueño"),
  $(opcion "$HECHO" "Hecho" GREEN "Fusionado o cerrado")
]}) { projectV2Field { ... on ProjectV2SingleSelectField { name } } } }" >/dev/null
for ISSUE in $(gh issue list -R "$REPO" --state open --json url --jq '.[].url'); do
  gh project item-add "$NUM" --owner "$OWNER" --url "$ISSUE" >/dev/null
done
echo "  Tablero: https://github.com/users/$OWNER/projects/$NUM"

echo "✓ Listo"
