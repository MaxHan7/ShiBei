
> recallo@0.1.0 app-store:account-decision-audit
> node tools/app-store-account-decision-consistency-audit.mjs --report --report

# Recallo App Store Account Decision Consistency Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
canonicalRecommendation=快速首版暂不做 Apple 登录；接受匿名数据恢复边界；上架后 P1 做可选 Apple 登录。
latestHandoff=docs/app-store-release-evidence/2026-07-04-user-handoff.md

## Checks
PASS docs/app-store-recommended-decisions-zh.md contains required text: 首版 Apple 登录 | 快速首版暂不做
PASS docs/app-store-recommended-decisions-zh.md contains required text: Apple 登录列入上架后 P1
PASS docs/app-store-user-input-field-map-zh.md contains required text: 首版是否加入可选 Apple 登录 | 快速首版暂不做
PASS docs/app-store-user-input-field-map-zh.md contains required text: disabled-first-release
PASS docs/app-store-user-action-checklist-zh.md contains required text: 首版是否加入 Apple 登录 | 快速首版暂不做
PASS docs/app-store-user-action-checklist-zh.md contains required text: 上架后 P1 做可选 Apple 登录
PASS docs/app-store-user-action-checklist-zh.md excludes forbidden text: 推荐可选加入；若赶时间可匿名首版
PASS docs/app-store-user-decision-form-zh.md contains required text: 快速首版暂不做；上架后 P1 做可选 Apple 登录
PASS docs/app-store-user-decision-form-zh.md excludes forbidden text: 二选一：若要数据恢复更稳，做；若要最快上架，首版暂不做
PASS docs/app-store-release-evidence/2026-07-04-user-handoff.md contains required text: 首版暂不做 Apple 登录，并接受匿名数据恢复边界：确认
PASS docs/app-store-release-evidence/2026-07-04-user-handoff.md excludes forbidden text: 推荐可选加入；若赶时间可匿名首版
PASS docs/app-store-review-submission-pack-zh.md contains required text: 快速首版匿名优先；暂不做 Apple 登录
PASS docs/app-store-review-submission-pack-zh.md contains required text: Anonymous-first release
PASS docs/app-store-review-submission-pack-zh.md excludes forbidden text: Apple 登录是否进入首版待决策
PASS docs/app-store-review-submission-pack-zh.md excludes forbidden text: 推荐可选加入；若赶时间可匿名首版
PASS docs/app-store-release-readiness-plan-zh.md contains required text: 快速首版暂不做 Apple 登录
PASS docs/app-store-release-readiness-plan-zh.md contains required text: 上架后 P1 做可选 Apple 登录
PASS docs/app-store-release-readiness-plan-zh.md excludes forbidden text: 推荐可选加入
PASS docs/app-store-release-readiness-plan-zh.md excludes forbidden text: 推荐 App Store 首版目标
PASS docs/app-store-release-readiness-plan-zh.md excludes forbidden text: 倾向可选做

Account decision consistency: READY
