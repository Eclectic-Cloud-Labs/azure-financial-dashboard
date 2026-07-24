# ADR 0002: Environment Promotion Strategy

## Now
Push to `main` → auto-deploys dev only. No prod automation yet.

## Later
Add GitHub Environments (`dev`/`prod`), require approval on prod, trigger prod via manual `workflow_dispatch` instead of auto-push.