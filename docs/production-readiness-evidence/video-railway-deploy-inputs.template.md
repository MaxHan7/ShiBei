# V2 Production Deploy Inputs

Copy this file to a dated private handoff note before deployment. Do not record secrets, model keys, database URLs, APNS private keys, Railway tokens, or private user content.

## Candidate

- PR:
- Candidate commit:
- `V2 Production Readiness` run URL:
- Operator:
- Date/time:

## Railway Target

- Production base URL: `https://shibei-production.up.railway.app`
- Railway project:
- Railway environment: production
- Railway service name:
- Railway service id:
- Connected branch:
- Autodeploy state:

## Video Runtime

- Video config source: code defaults with optional Railway override
- Video runtime strategy: Railpack Python venv + ffmpeg package
- Video ASR provider: default `local_whisper`
- Video visual provider: default `qwen-vl`
- Video max duration seconds: default `900`

## Rollback Point

- Current production deployment id:
- Current production backend commit if known:
- Rollback method: Railway rollback to previous deployment
- Rollback command or console path: Railway Console > Deployments > previous deployment > Redeploy
- Rollback owner:

## Data Strategy

- Data strategy: preserve-data
- Data reset confirmation: n/a
- Old production data status: existing beta data
- Old data export reference:
- Old data export created/verified at:

## Preserve-Data Backup

- Backup/snapshot reference:
- Backup created/verified at:
- Restore method: Railway Postgres restore from selected backup/snapshot
- Restore owner:
- Restore rehearsal status:

## Required Secret Presence

Only mark whether each secret exists. Do not paste secret values.

- `RAILWAY_TOKEN`: yes/no
- `DATABASE_URL`: yes/no
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`: yes/no
- `AI_PROVIDER`: yes/no
- model env (`DEEPSEEK_MODEL` or `OPENAI_MODEL`): yes/no
- APNS env set for production bundle: yes/no
- `TIKHUB_API_KEY` when video enabled: yes/no
- `QWEN_API_KEY` or `DASHSCOPE_API_KEY` when visual enabled: yes/no

## Deploy Decision

- Confirmation phrase for workflow: `deploy-v2-production`
- Rollback confirmation phrase for workflow: `rollback-ready`
- First deploy should use smoke after gate: no
- Reason to proceed:
- Known risks:
