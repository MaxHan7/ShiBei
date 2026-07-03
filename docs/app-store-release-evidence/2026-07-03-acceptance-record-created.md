
> recallo@0.1.0 app-store:acceptance-audit
> node tools/app-store-acceptance-audit.mjs --report docs/app-store-release-evidence/2026-07-03-production-acceptance.md

# Recallo App Store Production Acceptance Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
source=docs/app-store-release-evidence/2026-07-03-production-acceptance.md

Production acceptance: NOT READY (36 issues)
- 候选版本信息缺失：iOS build number
- 候选版本信息缺失：验收设备
- 候选版本信息缺失：iOS 版本
- 候选版本信息缺失：验收人
- P1 未通过且未豁免：A1 新用户首次启动 = (empty)
- P1 未通过且未豁免：A2 AI 处理同意 = (empty)
- P0 未通过：A3 真实生成成功 = (empty)
- P0 未通过：A4 后台/锁屏通知 = (empty)
- P0 未通过：A5 生成失败和删除 = (empty)
- P1 未通过且未豁免：A6 推荐好文模拟生成 = (empty)
- P1 未通过且未豁免：A7 主页学习路径 = (empty)
- P0 未通过：A8 复习 cursor 恢复 = (empty)
- P0 未通过：A9 错题回插 = (empty)
- P1 未通过且未豁免：A10 收藏/取消收藏 = (empty)
- P1 未通过且未豁免：A11 通知已读 = (empty)
- P0 未通过：A12 删除章节 = (empty)
- P1 未通过且未豁免：A13 隐私/账号/通知说明 = (empty)
- P0 未通过：A14 删除我的数据 = (empty)
- P0 未通过：A15 切语言稳定性 = (empty)
- P1 未通过且未豁免：A16 发现页内容 = (empty)
- P0 未通过：A17 UI 阻塞文案 = (empty)
- P1 未通过且未豁免：N1 无网络启动 = (empty)
- P0 未通过：N2 生成中断网 = (empty)
- P1 未通过且未豁免：N3 恢复网络 = (empty)
- 截图验收未通过：首页学习路径 = (empty)
- 截图验收未通过：添加文章 = (empty)
- 截图验收未通过：生成中页面 = (empty)
- 截图验收未通过：章节详情 = (empty)
- 截图验收未通过：做题页面 = (empty)
- 截图验收未通过：发现页推荐好文 = (empty)
- 最终结论勾选缺失：没有 P0
- 最终结论勾选缺失：没有未豁免 P1
- 最终结论勾选缺失：隐私政策、App Privacy 标签、审核备注一致
- 最终结论勾选缺失：截图来自正确 Recallo build
- 最终结论勾选缺失：用户已确认支持 URL、隐私 URL、每日额度数字、Apple 登录首版决策
- 最终结论必须明确为：通过
