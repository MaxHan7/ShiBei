
> recallo@0.1.0 app-store:external-console-audit
> node tools/app-store-external-console-audit.mjs --report

# Recallo App Store External Console Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
input=.release/app-store-inputs/external-console-checks.json
FAIL external_console_input_exists - Missing .release/app-store-inputs/external-console-checks.json

External console readiness: NOT READY (1 blocker)

## Required user actions
1. 复制 docs/app-store-external-console-checks.example.json 到 .release/app-store-inputs/external-console-checks.json，并填写 Apple Developer / App Store Connect 实际确认结果。
