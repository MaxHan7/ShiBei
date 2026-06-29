# 拾贝生产数据治理说明

## 目标

生产环境的用户核心数据必须满足四个要求：

- 正常读取只返回有效数据。
- 用户删除不会物理抹掉核心记录。
- 每次删除都有审计事件和删除前快照。
- 误删或异常清空后可以按章节恢复。

## 核心数据

当前核心数据包括：

- `chapters`: 用户生成或导入的章节与题目内容。
- `favorite_questions`: 用户收藏题目。
- `notifications`: 和章节生成、失败、完成相关的通知。
- `generation_jobs`: 生成任务和队列状态。

`device_push_tokens` 是推送 token。它可能随设备 token 刷新被替换，不作为长期内容资产保存，但全设备清空时会被纳入审计快照。

## 删除策略

章节、收藏、通知、生成任务使用软删除：

- `deleted_at IS NULL`: 正常有效数据。
- `deleted_at IS NOT NULL`: 已删除但可审计、可恢复数据。
- `deleted_reason`: 删除原因，例如 `chapter_deleted_by_user`。

正常 API 列表和详情只读取 `deleted_at IS NULL` 的记录。

## 审计表

`audit_events` 保存关键数据变更事件：

- `action`: 事件类型，例如 `chapter.soft_delete`、`chapter.restore`。
- `entity_type`: 实体类型。
- `entity_id`: 实体 ID。
- `metadata_json`: 删除原因、级联数量等结构化信息。
- `snapshot_json`: 删除或恢复时的关键快照。
- `created_at`: 事件时间。

## 常用运维命令

在 `backend` 目录下，先确保环境里有 `DATABASE_URL` 和必要的 `PGSSLMODE=require`。

查看某台设备的数据治理状态：

```sh
node scripts/data-governance-audit.mjs --device-id <device-id>
```

恢复某个已软删除章节：

```sh
node scripts/restore-deleted-chapter.mjs --device-id <device-id> --chapter-id <chapter-id>
```

恢复章节会同时恢复因该章节删除而被软删除的收藏和通知。

## 事故排查顺序

1. 查设备 ID 是否变化。
2. 跑 `data-governance-audit.mjs` 看 active/deleted/audit 数量。
3. 如果章节在 deleted 列表中，使用恢复脚本恢复。
4. 如果不在 active/deleted 中，再检查备份、手机缓存、历史环境。
5. 不直接在 production 手写 `DELETE`，除非已导出备份并记录原因。

## 当前边界

这次治理保证 App 层删除可追、可恢复。它不能恢复本次改造之前已经被硬删除且没有备份的数据。
后续如果进入更大范围测试，应继续补齐数据库自动备份、定期恢复演练、用户账号绑定和跨设备身份迁移。
