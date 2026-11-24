#!/usr/bin/env bash
# MC-64 · Protege main: solo entra por pull request y con la revisión «check, test y capturas» en verde.
# Lo corre el dueño del repo con su sesión de GitHub (`gh auth login`). El repo es público desde el 19 nov, así que
# GitHub deja proteger ramas en el plan gratis (en un repo privado pide GitHub Pro: ver docs/ENTORNOS.md).
#   bash scripts/proteger-main.sh [dueño/repo]              aplica la protección
#   bash scripts/proteger-main.sh --verificar [dueño/repo]  solo revisa que esté activa (sale con 1 si no)
set -euo pipefail
verificar=0
if [ "${1:-}" = "--verificar" ]; then
  verificar=1
  shift
fi
repo="${1:-luiscf1226/mundo-catrucho}"

if [ "$verificar" = 1 ]; then
  estado="$(gh api "repos/$repo/branches/main/protection" \
    -q '[(.required_status_checks.contexts | index("check, test y capturas") != null), .enforce_admins.enabled, (.required_pull_request_reviews != null)] | @tsv' 2>/dev/null || true)"
  if [ "$estado" = "$(printf 'true\ttrue\ttrue')" ]; then
    echo "main protegida en $repo: pull request obligatorio, «check, test y capturas» en verde y también para admins."
    exit 0
  fi
  echo "main NO está protegida como pide MC-64 en $repo (estado: ${estado:-sin protección}). Corré: bash scripts/proteger-main.sh" >&2
  exit 1
fi

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
