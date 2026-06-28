# Recallo 工程安全审查记录

日期：2026-06-28

## 结论

近期“改到旧版本代码”或“装机后变成旧版本”的核心原因不是单个代码 bug，而是工程隔离不足：

1. 本机同时存在多个相似工程目录：
   - `/Users/hanmingyu/Downloads/拾贝`
   - `/Users/hanmingyu/Downloads/拾贝-prod-hardening`
   - `/Users/hanmingyu/Downloads/拾贝-v2-baseline`
   - `/Users/hanmingyu/Downloads/拾贝-prompt-lab`
   - `/Users/hanmingyu/Downloads/拾贝-dspy-lab`
2. 当前主工作区 `/Users/hanmingyu/Downloads/拾贝-prod-hardening` 是 Git worktree，`.git` 指向 `/Users/hanmingyu/Downloads/拾贝/.git/worktrees/拾贝-prod-hardening`。这会让“旧主目录”和“新工作树”长期并存。
3. Xcode DerivedData 中保留了多份旧产物，包括 `拾贝.app`、`ShiBei.app`、旧 V2 dev bundle 产物。若手动或文档命令使用通配路径安装，就可能把旧包装到手机上。
4. 历史文档和实验目录中仍有大量旧路径命令，尤其是 `experiments/shibei-v2/ios/拾贝.xcodeproj`、`/Users/hanmingyu/Downloads/拾贝-v2-baseline/...`、`DerivedData/拾贝-*/.../拾贝.app`。这些只能作为历史记录，不能作为当前装机入口。

## 当前唯一可信工作区

当前产品工程入口：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
```

当前分支：

```bash
codex/recallo-review-replay-mode
```

当前 iOS 工程仍保留旧 scheme/path：

```bash
拾贝/拾贝.xcodeproj
scheme: 拾贝
```

但当前产物和 App 显示名必须是：

```bash
Recallo.app
CFBundleDisplayName = Recallo
CFBundleIdentifier = com.maxhan.shibei
```

保留 `com.maxhan.shibei` 是为了覆盖同一个手机 App，避免安装成另一个新 App。

## 已加防护

新增：

```bash
node tools/recallo-workspace-guard.mjs
```

它会检查：

- 当前 Git root 是否就是 `/Users/hanmingyu/Downloads/拾贝-prod-hardening`
- 根包名是否是 `recallo`
- 后端包名是否是 `recallo-generation-demo`
- Xcode 产物是否指向 `Recallo.app`
- App 显示名是否是 `Recallo`
- bundle id 是否仍是 `com.maxhan.shibei`
- 安装脚本是否强制安装 `Recallo.app` 并校验显示名

`tools/install-official-ios.sh` 已在构建前自动调用该 guard。

## 当前装机唯一入口

以后真机安装只允许使用：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
./tools/install-official-ios.sh
```

禁止使用：

```bash
xcrun devicectl device install app .../DerivedData/拾贝-*/.../拾贝.app
xcrun simctl install .../DerivedData/拾贝-*/.../拾贝.app
experiments/shibei-v2/ios/拾贝.xcodeproj
/Users/hanmingyu/Downloads/拾贝-v2-baseline/...
/Users/hanmingyu/Downloads/拾贝/...
```

## 建议的下一步隔离

1. 不删除旧工程，但将旧目录统一标记为 archive，只作为历史参考。
2. 清理 DerivedData 中旧的 `拾贝.app`、`ShiBei.app` 缓存，避免手动安装时误选。
3. 后续单独做一次 Xcode 工程级改名，把 target/scheme/path 从 `拾贝` 迁移到 `Recallo`。这一步要独立 checkpoint，不能和业务功能一起改。
4. 将远程仓库名从 `ShiBei` 改为 `Recallo`，并同步 remote URL。该动作需要 GitHub 仓库重命名权限，适合在部署前单独做。

