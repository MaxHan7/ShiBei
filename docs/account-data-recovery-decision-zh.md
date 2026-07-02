# Recallo 账号与数据恢复决策包

> 本文档用于决定 App Store 首版是否加入 Apple 登录，以及当前匿名设备数据的删除、恢复和迁移边界。结论会回写到 `docs/app-store-release-readiness-plan-zh.md`。

## 1. 当前结论

推荐路线：

| 阶段 | 身份方案 | 结论 |
| --- | --- | --- |
| TestFlight 中度测试 | 匿名设备 ID | 可以继续使用，但必须把“数据绑定当前设备”写进账号说明和隐私说明。 |
| App Store 首版 | 可选 Apple 登录 | 推荐进入首版或首版后最高优先级。它解决重装、换机、不同设备恢复学习数据的问题。 |
| App Store 首版如果赶时间 | 匿名首版 | 可以作为短期方案，但必须接受数据恢复弱、用户信任弱、客服恢复能力弱。 |

不推荐强制登录后才能体验。更成熟的路径是：

1. 用户可以匿名开始使用。
2. 用户可选择“用 Apple 登录保存学习数据”。
3. 登录后把当前匿名设备数据绑定到账号。
4. 后续换机/重装后通过 Apple 登录恢复数据。

## 2. 当前匿名 ID 链路

iOS 端身份由 `DeviceIdentityStore` 生成和保存：

- Keychain service：`com.shibei.app.device-identity`
- Keychain account：`anonymous-device-id`
- Keychain accessible：`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- UserDefaults 备份键：`anonymousDeviceIdBackup`

读取顺序：

1. 优先读取 Keychain 中已有匿名 ID。
2. Keychain 没有时读取 UserDefaults 备份。
3. 两者都没有时生成新的 UUID。
4. 每次读到有效 ID 后，同步写回 Keychain 和 UserDefaults。

iOS API 客户端初始化时使用：

```swift
deviceId: String = DeviceIdentityStore.shared.currentDeviceId()
```

所有真实 API 请求都会带：

```text
X-Device-Id: <anonymous-device-uuid>
```

后端用 `X-Device-Id` 隔离：

- chapters
- notifications
- generation_jobs
- generation_quota_claims
- device_push_tokens
- favorite_questions
- review sessions / progress 相关数据
- audit_events

后端当前会校验生产 API 的 deviceId 格式。缺失或非法时，除健康检查、版本、推荐文章读取等少数公开接口外，会返回 `invalid_device_id`。

## 3. 为什么会出现“数据像丢了”的风险

当前数据不是只存在本地。章节、通知、收藏、生成任务和复习进度都在服务器上按 deviceId 保存。

真正的风险是：匿名 deviceId 是读取服务器数据的唯一钥匙。只要 App 运行时拿到的是另一个 deviceId，用户就会看到一个“新设备”的空数据状态。旧数据可能仍在服务器上，但客户端无法自动知道旧 deviceId。

会触发这个风险的情况：

- 装错旧工程、旧 bundle 或旧 build，导致使用了不同的 App 容器或不同的身份存储实现。
- 改动 bundle identifier、Keychain service、access group 或重签名方式，导致 Keychain 读取上下文变化。
- 用户删除 App、换机、系统迁移失败，导致 Keychain 和 UserDefaults 都不可用。
- 调试入口调用 `resetDeviceId()`，主动重置匿名 ID。
- 未来如果改名/迁移工程时没有保持身份存储兼容，也可能产生新匿名 ID。

语言偏好切换本身不应该删除服务器数据。它暴露的是“匿名身份一旦变化，数据不可自动找回”的结构性弱点。

## 4. 当前已经具备的防护

- iOS 使用 Keychain 保存匿名 ID，并用 UserDefaults 做备份。
- API 请求统一带 `X-Device-Id`。
- 后端按 deviceId 隔离数据，并对生产 API 做 deviceId 格式校验。
- `DELETE /api/device-data` 可以删除当前匿名设备下的数据。
- 删除章节和删除设备数据会软删除章节、通知、收藏、生成任务，并写入 `audit_events` snapshot。
- Release preflight 已加入正确工作区和包配置检查，降低装错旧工程风险。

## 5. 当前仍不能解决的问题

匿名方案不能保证：

- 换机后恢复数据。
- 删除 App 后一定恢复数据。
- 用户主动重置匿名 ID 后恢复数据。
- 客服在不知道旧 deviceId 的情况下帮用户找回数据。
- 多设备同步。
- 用户把匿名数据稳定迁移到新设备。

这不是单个 bug，而是匿名身份模型的天然限制。

## 6. 如果首版不做账号

用户体验边界：

- 同一台设备、同一个 App 身份上下文下，数据可以持续保存。
- 重装、换机、TestFlight/正式版身份变化时，数据可能无法恢复。
- 用户可以删除当前设备下的数据。
- 用户不能登录找回历史数据。

必须同步做的文案：

- 账号说明：当前版本使用匿名设备身份，学习数据绑定当前设备。
- 隐私说明：说明匿名设备 ID、学习数据、生成内容、通知 token 的用途。
- 删除说明：删除的是“当前设备身份下的数据”，不是跨设备账号。

适用场景：

- TestFlight 中度测试。
- 用户规模小、可接受重新开始。
- 目标是尽快验证核心体验。

不适用场景：

- 正式扩大用户。
- 用户会长期积累学习数据。
- 需要客服恢复数据。

## 7. 如果加入 Apple 登录

新增数据模型建议：

| 表/字段 | 作用 |
| --- | --- |
| `users` | App 级用户实体。 |
| `user_identity_links` | 绑定 Apple `sub` 和内部 user id。 |
| `device_account_links` | 绑定匿名 deviceId 和 user id，支持匿名数据迁移。 |
| `devices.user_id` 或关联表 | 让设备数据可以归属账号。 |
| `account_deletion_requests` 或 audit event | 记录账号删除请求与完成时间。 |

新增接口建议：

| 接口 | 作用 |
| --- | --- |
| `POST /api/auth/apple` | 校验 Apple identity token，创建或恢复 user。 |
| `POST /api/account/link-device` | 把当前匿名 device 数据绑定到 user。 |
| `GET /api/account/me` | 返回当前账号和绑定状态。 |
| `DELETE /api/account` | 删除账号及其绑定数据。 |
| `POST /api/account/sign-out` | 退出登录，本地清 token。 |

前端入口建议：

- 个人主页卡片：`用 Apple 登录保存学习数据`
- 账号说明页：登录状态、数据绑定说明、退出登录、删除账号。
- 首次登录解释：登录用于保存和恢复学习数据，不强制。

登录后的数据策略：

- 匿名用户登录成功后，默认把当前 deviceId 下的数据绑定到 Apple account。
- 同一账号多设备读取服务端账号数据。
- 本地只做缓存，不作为权威来源。
- 如果多个设备都有数据，首版建议按“合并章节、收藏、通知；复习进度以更新时间较新的 session 为准”的策略处理。

## 8. 如果做账号，删除账号必须删除什么

只要 App 提供账号创建，App 内就必须提供删除账号入口。删除账号不等于退出登录。

删除范围建议：

- user profile
- Apple identity link
- device/account links
- chapters
- review sessions / review progress
- favorite_questions
- notifications
- generation_jobs
- generation_quota_claims
- device_push_tokens
- feedback / diagnostics 中可关联该用户的数据

删除后本地处理：

- 清除登录 token / user id。
- 清除已登录状态。
- 生成新的匿名身份，或回到未登录匿名状态。
- 不自动恢复已删除账号数据。

审计要求：

- 写入账号删除 audit event。
- 保留最小必要的删除证明，不保留可重建用户内容的数据。
- 隐私政策说明备份残留保留期和恢复覆盖方式。

## 9. 决策矩阵

| 选项 | 上架速度 | 数据恢复 | 审核复杂度 | 风险 | 推荐 |
| --- | --- | --- | --- | --- | --- |
| 匿名首版 | 快 | 弱 | 低 | 换机/重装不可恢复，正式用户信任弱 | 仅适合短期 TestFlight 或极快首版 |
| Apple 登录可选 | 中 | 强 | 中 | 需要新增账号删除、迁移、隐私文案 | 推荐 |
| 强制 Apple 登录 | 慢 | 强 | 中 | 首次体验门槛高，核心体验转化下降 | 不推荐首版 |

## 10. 需要用户拍板

请确认以下三件事：

1. App Store 首版是否要加入可选 Apple 登录。
2. 如果暂不加入，是否接受首版文案明确写：“当前学习数据绑定本设备，重装或换机可能无法恢复。”
3. 是否把“账号/数据恢复能力”设为首版后最高优先级，而不是长期后置。

## 11. Codex 后续可自动执行的事项

如果用户选择“匿名首版”：

- 更新隐私政策和账号说明，避免误称有账号系统。
- 增加账号说明里的匿名身份边界。
- 检查 App 内删除数据入口与 `DELETE /api/device-data` 一致。
- 补一份匿名 ID 稳定性回归清单。

如果用户选择“Apple 登录可选”：

- 设计账号数据模型和迁移接口。
- 实现 Sign in with Apple 前后端链路。
- 实现删除账号入口和服务端删除。
- 更新隐私政策、App Review 备注、App Privacy 标签。
- 增加账号/删除/迁移测试。

