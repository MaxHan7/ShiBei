# App Store 用户决策表准备记录

日期：2026-07-02

## 本次完成

新增一页式用户决策表：

- `docs/app-store-user-decision-form-zh.md`

该表把 App Store 首版仍需用户拍板的信息集中到一处：

- 免费 / IAP / 每日额度 / 推荐好文计额。
- Apple 登录是否进入首版。
- 匿名数据恢复边界。
- 支持邮箱、Privacy URL、Support URL。
- Subtitle、Promotional Text、关键词等元数据确认。
- 真机验收和截图状态。
- Xcode / App Store Connect 手动确认项。

## 后续流程

用户填完该表后，Codex 可以：

1. 回写隐私政策、支持页、App Store 元数据、审核包和主台账。
2. 跑 `npm run check:app-store-submit`。
3. 如果严格提交 guard 通过，再进入 Archive 前检查。

## 仍需用户完成

- 填写该决策表。
- 提供最终 Support URL、Privacy URL 和支持邮箱。
- 完成真机验收和 App Store 截图。
