# Recallo App Store / Apple Developer 外部控制台确认清单

> 这份清单只覆盖 Codex 无法替你直接登录确认的 Apple 外部后台事项。完成后，把确认结果写入 `.release/app-store-inputs/external-console-checks.json`，再运行 `npm run check:app-store-external-console`。

## 1. 创建确认文件

先复制模板：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
mkdir -p .release/app-store-inputs
cp docs/app-store-external-console-checks.example.json .release/app-store-inputs/external-console-checks.json
```

然后把里面的 `待确认` 改成实际确认结果。布尔项用 `true` / `false`，文本项填写 Apple 后台里看到的实际值。

## 2. Apple Developer 必查项

| 项目 | 正确值/要求 | 去哪里看 | 为什么必须确认 |
| --- | --- | --- | --- |
| App ID / Bundle ID | `com.maxhan.shibei` | Apple Developer > Certificates, Identifiers & Profiles > Identifiers | 必须替换旧 TestFlight 的同一个 App，不能创建新产品 |
| Push Notifications capability | `true` | App ID capability 列表 | 生成完成/失败需要后台系统推送 |
| Sign in with Apple capability | 与首版决策一致 | App ID capability 列表 | 如果首版做 Apple 登录，必须启用；如果首版不做，不应误开导致审核说明不一致 |
| Production APNs 配置 | `true` | Apple Developer APNs key/certificate + Railway 环境变量 | 避免 TestFlight/正式包后台通知不可用 |

## 3. App Store Connect 必查项

| 项目 | 正确值/要求 | 去哪里看 | 为什么必须确认 |
| --- | --- | --- | --- |
| 使用现有 App 记录 | `true` | App Store Connect > My Apps | 继续旧 TestFlight，不重新建 App |
| Bundle ID | `com.maxhan.shibei` | App 信息 / Build 页面 | 确认提交的是旧产品对应的 bundle |
| App Name | `Recallo` | App 信息 | 用户可见名称必须是新品牌 |
| SKU | 任意稳定值 | App 信息 | 只需记录，便于排查 |
| Primary Category | 与决策表一致 | App 信息 | 元数据必须最终定稿 |
| Pricing | 免费 | Pricing and Availability | 首版不做 IAP/订阅 |
| Privacy Policy URL | 公开 HTTPS URL | App Privacy / App 信息 | 必填/审核常查 |
| Support URL | 公开 HTTPS URL | App 信息 | 用户支持入口 |
| App Privacy 标签 | 已按 `docs/app-store-privacy-labels-zh.md` 填写 | App Privacy | 必须与真实数据流一致 |
| Age Rating | 已完成 | App 信息 | 提交审核必填 |
| Screenshots | 已上传且无旧品牌/旧 UI | Product Page | 首版展示必须准确 |
| Build | 选择最新 Recallo build | TestFlight / Build 选择 | 防止把旧工程包提交审核 |
| Review Notes | 已粘贴最新审核说明 | App Review Information | AI、通知、匿名数据和测试路径需要解释清楚 |

## 4. 校验命令

查看当前缺什么：

```bash
npm run app-store:external-console-audit
```

最终严格检查：

```bash
npm run check:app-store-external-console
```

严格检查通过前，不要提交 App Review。
