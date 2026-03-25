# Secrets Directory

This directory stores generated secrets for all platform services.

## First-Time Setup

```bash
bash scripts/generate-secrets.sh
```

This generates strong random passwords and creates per-service `.env` files.

## Files

- `*-password` / `*-secret` — Individual secret values
- `*.env` — Per-service environment files (combine all secrets for that service)
- `.generated` — Timestamp of when secrets were last generated

## Security

- All files are `chmod 600` (owner read-only)
- This directory is gitignored (secrets never enter version control)
- Regenerate secrets with `bash scripts/generate-secrets.sh`
