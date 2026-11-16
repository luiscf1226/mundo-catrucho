#!/usr/bin/env bash
# MC-64 · Protege main: solo entra por pull request y con la revisión «check, test y capturas» en verde.
# Lo corre el dueño del repo con su sesión de GitHub (`gh auth login`); los agentes no tienen ese permiso.
#   bash scripts/proteger-main.sh [dueño/repo]
set -euo pipefail
repo="${1:-luiscf1226/mundo-catrucho}"
gh api -X PUT "repos/$repo/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["check, test y capturas"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false
}
JSON
echo "main protegida en $repo: pull request obligatorio y «check, test y capturas» en verde."
