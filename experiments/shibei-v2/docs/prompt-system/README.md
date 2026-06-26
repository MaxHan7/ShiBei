# V2 Prompt System Visualization

这个目录是拾贝 V2 prompt 初级系统的长期可视化审查入口，不是临时调试输出。

## 文件

- `v2-prompt-system-structure.html`
  - 展示当前 V2 生成链路的 stage 顺序、模型调用边界、prompt builder、schema、源码摘录和文案预览。
  - 用于人工审查 prompt 架构、字段合同、ECD/DSPy 原则是否真正落到每个 stage。
  - 这个 HTML 应提交入库，作为每次重要 prompt 架构迭代后的可读快照。

## 生成方式

从仓库根目录运行：

```bash
node experiments/shibei-v2/docs/tools/generate-v2-prompt-system-map.mjs
```

脚本会读取：

- `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.js`
- 对应的 prompt schema 文件

然后重新生成 `v2-prompt-system-structure.html`。

## 维护原则

- 不要把这里当成缓存目录清理。
- 不要直接手改 HTML 作为源头；结构变化应先改 prompt/schema/pipeline 或生成脚本，再重新生成。
- 每次重要 prompt 架构调整后，都应该重新生成这个页面。
- 如果页面展示的信息不够清楚，优先改 `generate-v2-prompt-system-map.mjs`，让可视化能力长期变好。
- 这个页面和质量报告不同：质量报告回答“这次生成结果怎么样”，本页面回答“当前系统结构到底长什么样”。
- 页面会展示部分 legacy / 对照 stage（例如旧的整章 draft batch、显式 ECD planning、unitPracticePlan 等）。判断当前真实主链路时，以页面里的 active stages 和 `V2_GENERATION_STAGES` 为准；legacy stage 不代表生产链路仍在调用。
