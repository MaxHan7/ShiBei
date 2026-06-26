# V2 Production Deploy Inputs Template

Copy this file to a dated private handoff note before deployment, or use it as the checklist while filling the `V2 Production Railway Deploy` workflow. Do not record secrets, model keys, database URLs, APNS private keys, Railway tokens, or private user content.

This template is not accepted as final release evidence. The deploy workflow writes the formal `deployment-intent.md` artifact after the real inputs are provided.

## Candidate

- PR:
- Candidate commit:
- `V2 Production Readiness` run URL:
- Operator:
- Date/time:

## Railway Target

- Production base URL: `https://shibei-production.up.railway.app`
- Railway project:
- Railway environment:
- Railway service name:
- Railway service id:
- Connected branch:
- Autodeploy state:

## Rollback Point

- Current production deployment id:
- Current production backend commit if known:
- Rollback method: Railway rollback / deploy old commit / other
- Rollback command or console path:
- Rollback owner:

## Data Strategy

- Data strategy: preserve-data / reset-data
- Data reset confirmation: reset-old-test-data / n/a
- Old production data status: test data only / real user data / unknown
- Old data export reference:
- Old data export created/verified at:

Use `reset-data` only for the current V2 first production test if old production test data can be deleted and V2 starts from an empty database. This is not the long-term production strategy.

Use `preserve-data` for real users or anytime old production data must survive. In that mode, the backup/restore fields below are required.

## Preserve-Data Backup

- Backup/snapshot reference:
- Backup created/verified at:
- Restore method:
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

## Deploy Decision

- Confirmation phrase for workflow: `deploy-v2-production`
- Rollback confirmation phrase for workflow: `rollback-ready`
- First deploy should use smoke after gate: no
- Reason to proceed:
- Known risks:
