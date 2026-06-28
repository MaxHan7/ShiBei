# 好文推荐管理员工作流

这套流程用于 TestFlight 前预置发现页好文，并提前生成好复习章节。MVP 阶段不做后台 CMS，管理员通过版本化文件管理内容；用户只能读取和导入。

## 文件角色

- `backend/content/recommended-candidates.json`
  - 候选池。用于记录还没有完成生成/验收的文章。
  - 不会直接暴露给客户端。
- `docs/recommended-articles-candidate-audit-zh.md`
  - 候选池可抽取性审查报告。
- `backend/content/recommended/<article-id>-chapter.json`
  - 已生成并验收过的章节 artifact。
- `backend/content/recommended/covers/<article-id>-cover.svg`
  - 推荐卡片封面。
- `backend/content/recommended-articles.json`
  - 正式上架池。只有进入这里的文章才会出现在发现页。

## 标准流程

1. 添加候选文章
   - 在 `backend/content/recommended-candidates.json` 增加条目。
   - 必填：`id`、`title`、`source`、`sourceUrl`、`sourceAuthor`、`language`、`tags`、`description`、`contentAccess`。
   - `id` 必须稳定，后续章节 artifact、封面、导入记录都会引用它。

2. 审查可抽取性

   ```bash
   cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
   node backend/scripts/audit-recommended-candidates.mjs
   ```

   重点看 `docs/recommended-articles-candidate-audit-zh.md`：
   - `direct_html_ready`：可以进入生成前审阅。
   - `long_needs_excerpt`：先清洗/节选到适合学习的正文范围。
   - `needs_pdf_or_manual_text`：先从 PDF 提取干净文本，保存成本地 `.txt`，再生成。

3. 生成 prepared chapter

   HTML 来源：

   ```bash
   DEEPSEEK_API_KEY=... node backend/scripts/build-recommended-article.mjs \
     --candidate-id google-llm-introduction
   ```

   PDF 或人工清洗文本：

   ```bash
   DEEPSEEK_API_KEY=... node backend/scripts/build-recommended-article.mjs \
     --candidate-id imf-inflation-prices-on-the-rise \
     --text-file /path/to/cleaned-imf-inflation.txt
   ```

   脚本会输出 `catalogPreparedChapterPath`，例如：

   ```text
   recommended/google-llm-introduction-chapter.json
   ```

4. 人工验收
   - 用质量报告或本地导入检查题目质量。
   - 确认至少：
     - 单元切分合理。
     - 题目不是只考表层信息。
     - 连线题文字没有明显过长。
     - 来源标题、作者、原文链接正确。
     - 用户导入后能开始复习。

5. 上架到正式 catalog
   - 在 `backend/content/recommended-articles.json` 加入条目。
   - 填入 `coverImagePath` 和 `preparedChapterPath`。
   - 只上架已经验收过的文章。

6. 验证与部署

   ```bash
   cd /Users/hanmingyu/Downloads/拾贝-prod-hardening/backend
   npm run check:v2
   ```

   部署后检查：
   - `GET /api/v2/recommended-articles` 能看到新文章。
   - `GET /api/v2/recommended-articles/<id>` 能看到 prepared chapter。
   - `POST /api/v2/recommended-articles/<id>/import` 能导入用户章节列表。

## 常见维护操作

### 只改展示信息

适用场景：修改标题、作者、来源名称、简介、标签、排序、封面路径。

1. 修改 `backend/content/recommended-articles.json`。
2. 如果只是文字或标签变化，不需要重新生成 `preparedChapterPath` 指向的章节。
3. 跑推荐文章测试：

   ```bash
   cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
   node --test backend/src/v2/recommended/recommendedArticles.test.js
   node backend/scripts/check-recommended-catalog.mjs
   ```

4. 如果影响发现页展示，再用手机或 Simulator 看一遍卡片是否溢出。

### 更换封面

适用场景：推荐卡片右侧图片需要替换，但文章和题目不变。

1. 把新封面放到 `backend/content/recommended/covers/<article-id>-cover.svg`。
2. 确认 `backend/content/recommended-articles.json` 的 `coverImagePath` 指向正确文件。
3. 用 `GET /api/v2/recommended-articles/<id>/cover` 检查是否返回 `200`。
4. 在发现页检查裁切、层级和文字遮挡。

### 下架一篇好文

适用场景：暂时不想让用户看到某篇文章。

1. 从 `backend/content/recommended-articles.json` 删除对应条目。
2. 默认保留 `backend/content/recommended/<article-id>-chapter.json` 和封面文件，作为可回滚归档。
3. 如果确认永久删除，再单独删除 chapter 和 cover。
4. 跑推荐文章测试，确认没有断开的 `preparedChapterPath` 或重复 id。

### 重新生成题目

适用场景：题目质量不满意、文章节选范围变化、希望调整 unit 数量或难度。

1. 不直接手改正式 catalog；先回到候选源或准备好的干净文本。
2. 使用 `backend/scripts/build-recommended-article.mjs` 重新生成。
3. 生成后先人工验收，再覆盖 `backend/content/recommended/<article-id>-chapter.json`。
4. 保持 `recommendedArticleId`、`sourceUrl`、`sourceAuthor` 可追溯。
5. 重新跑导入 smoke，确认用户导入的是新章节。

### 新增一篇正式好文

适用场景：已经确认文章可以进入发现页，并且要让用户几秒内开始学习。

1. 先进入候选池：`backend/content/recommended-candidates.json`。
2. 跑候选审查：`node backend/scripts/audit-recommended-candidates.mjs`。
3. 抽取、清洗或节选正文；长文不要直接整篇塞给模型。
4. 用 DeepSeek 生成 prepared chapter。
5. 人工验收题目质量。
6. 准备封面。
7. 准备中文展示内容：
   - 中文标题、中文简介必须写入 `backend/content/recommended-articles.json`。
   - App 内阅读页使用的 `preparedChapter.source.blocks` 必须是中文学习稿或中文授权原文。
   - 不允许把英文网页原文短摘录直接作为正式上架内容。
8. 加入 `backend/content/recommended-articles.json`。
9. 跑测试和导入 smoke。

### 上线前最小验收清单

每次维护推荐好文后，至少确认：

- `backend/content/recommended-articles.json` 没有重复 `id`。
- 每个正式条目的 `coverImagePath` 文件存在。
- 每个正式条目的 `preparedChapterPath` 文件存在。
- 每个正式条目的标题为中文展示标题。
- 每个正式条目的 App 内阅读内容不少于 1000 个字符，且应为中文学习稿或中文授权原文。
- 新增 chapter 不包含 `rawText`、`cleanedText`、`extractedText` 或 API key。
- `node --test backend/src/v2/recommended/recommendedArticles.test.js` 通过。
- `node backend/scripts/check-recommended-catalog.mjs` 通过。
- `cd backend && npm run check` 通过。
- 至少 smoke 一篇新增/修改文章：
  - 发现页能看到卡片。
  - 详情页能打开。
  - 封面能显示。
  - 点击开始学习能导入 completed chapter。
  - 进入复习流程没有空数据或崩溃。

## 当前 8 篇候选的处理顺序

优先直接生成：

1. `google-llm-introduction`
2. `learning-scientists-six-strategies`
3. `retrieval-practice-powerful-strategy`
4. `christensen-disruptive-innovation`

先清洗/节选再生成：

1. `ibm-large-language-models`
2. `nng-usability-heuristics`
3. `producttalk-continuous-discovery`

先提取 PDF 文本再生成：

1. `imf-inflation-prices-on-the-rise`

## 版权与呈现原则

- 推荐页展示来源、作者、标题和原文链接。
- 封面优先使用自制统一风格封面，避免直接搬运第三方封面。
- prepared chapter 是学习结构化结果，不把第三方全文作为我们的文章公开展示。
- 如果要在 App 内显示原文阅读页，需确认来源授权或只显示用户自己上传/可合法展示的内容。
