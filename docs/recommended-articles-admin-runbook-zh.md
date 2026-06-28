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
   cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
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
   cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/backend
   npm run check:v2
   ```

   部署后检查：
   - `GET /api/v2/recommended-articles` 能看到新文章。
   - `GET /api/v2/recommended-articles/<id>` 能看到 prepared chapter。
   - `POST /api/v2/recommended-articles/<id>/import` 能导入用户章节列表。

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
