# 出题 Prompt 实验版本固定规范

本文档用于固定每一轮出题 prompt 实验的代码版本，避免后续无法判断某次结果到底对应哪一版代码。

## 固定版本命令

每一轮形成可继续对比的版本后，必须先提交代码，再打 tag：

```bash
git status --short
npm --prefix backend run check
git diff --check
rg -n "sk-[A-Za-z0-9_-]+" . -g '!node_modules' -g '!backend/node_modules'

git add <本轮代码与文档文件>
git commit -m "experiment: checkpoint <version-label>"
git tag -a question-<version-label> -m "Question generation <version-label>"
```

示例：

```bash
git tag -a question-v26-prd-field-standard-lean-prompt -m "Question generation v26 PRD field standard lean prompt"
```

## 回滚版本命令

需要回到某一版代码时，优先新建分支，不直接覆盖当前实验现场：

```bash
git switch -c restore-<version-label> question-<version-label>
```

如果只需要查看某个版本的文件：

```bash
git show question-<version-label>:backend/src/generation/prompts/questions.js
git show question-<version-label>:backend/src/generation/generateQuestions.js
```

## AAA Control 命令

同一版本做三次重复实验时，固定文章、固定 slug，只改 label：

```bash
QUALITY_ARTICLE_URL="https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw" \
QUALITY_EXPERIMENT_SLUG="UMr6ia1QubqOMw3aBUGbOw" \
QUALITY_EXPERIMENT_LABEL="<version-label>-aa-control-r1" \
AI_PROVIDER=deepseek \
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
npm --prefix backend run quality:single
```

重复运行 `r2`、`r3`。API key 只能来自当前 shell 环境变量，不写入 `.env`、文档、命令历史或实验产物。

## 记录要求

- 每个实验 JSON 必须包含 `versionFingerprint`。
- 每次报告必须记录 tag 名、commit SHA、prompt hash、diff hash。
- 不把失败的 key 调试产物纳入版本锚点。
- 不用单次结果判断 prompt 好坏；至少用同版本 AAA control 判断模型自然波动范围。
