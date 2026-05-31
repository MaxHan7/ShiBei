# 认知动作驱动出题系统优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将拾贝出题系统从“每个知识点尽量 3 道题”升级为“每个高价值知识点尽量覆盖核心回忆、边界辨析、场景迁移三类认知动作”。

**Architecture:** 不只改 prompt，而是新增“练习蓝图 -> 按蓝图出题 -> 按蓝图验收”的结构化链路。知识点先生成 `practiceBlueprint`，题目必须声明并完成 `memoryAngle`，入池选择器按来源可信、认知动作覆盖、题型多样、重复风险排序。

**Tech Stack:** Node.js 后端生成模块、DeepSeek/OpenAI 结构化 JSON 输出、现有 quality single-article 实验系统、HTML 质量工作台、Swift/iOS 只需兼容新增字段。

---

## 背景和 PRD 口径

这轮 PRD 已更新：题量不是最高目标。每个知识点 1-3 道题的真实意图是让用户完成递进学习：

1. **核心回忆**：取回知识点最重要的判断。
2. **边界辨析**：分清相似概念、适用边界和常见误区。
3. **场景迁移**：把知识点应用到新场景。

题型服务于认知动作。若 3 道题同题型但认知动作不同，可以接受；若只是换壳重复，即使题型不同也不应全部入池。

## File Structure

- Modify: `backend/src/generation/extractKnowledgeCandidates.js`
  - 保留现有知识点字段，兼容新增 `practiceBlueprint` 的输入线索。
- Modify: `backend/src/generation/generateQuestions.js`
  - 新增练习蓝图生成和按蓝图补题逻辑。
- Modify: `backend/src/generation/prompts/questions.js`
  - 拆分普通出题 prompt、练习蓝图 prompt、认知动作专项 prompt。
- Modify: `backend/src/generation/evaluateQuestions.js`
  - 增加 `memoryAngleFitScore`、`blueprintAlignmentScore`、`typeDiversityReason` 诊断。
- Modify: `backend/src/generation/tests/reviewableSelection.test.js`
  - 测试入池选择器是否优先认知动作覆盖，而不是单纯凑满 3 题。
- Modify: `backend/src/generation/tests/qualityReport.js`
  - 输出每知识点认知动作覆盖、题型覆盖、同质题诊断。
- Modify: `backend/src/generation/tests/singleArticleExperiment.js`
  - 单篇实验报告加入 PRD 对齐指标。
- Modify: `demo/quality-review.js`
  - 质量工作台展示 `memoryAngle`、蓝图、题型多样原因、解释一致性诊断。
- Modify: `docs/ios-api-data-contract-zh.md`
  - 记录新增兼容字段。
- Modify: `quality-test-set/manual-scoring-template.md`
  - 增加人工标注维度：认知动作是否成立、是否重复、解释是否忠实、误区是否真实。

## Public Data Shape

`KnowledgePoint` 新增可选字段：

```json
{
  "practiceBlueprint": [
    {
      "id": "kp-1-core_understanding",
      "memoryAngle": "core_understanding",
      "goal": "取回 hook 与 prompt 的核心区别",
      "preferredQuestionType": "multiple_choice",
      "sourceEvidenceRole": "definition",
      "avoid": "不要问 React Hook"
    }
  ]
}
```

`ReviewQuestion` 新增可选字段：

```json
{
  "blueprintItemId": "kp-1-misconception_boundary",
  "memoryAngle": "misconception_boundary",
  "blueprintGoal": "区分 hook、prompt、CI 的责任边界",
  "memoryAngleFitScore": 4,
  "blueprintAlignmentScore": 4,
  "typeDiversityReason": "该知识点的三个题分别覆盖核心、边界、场景；其中两题同为场景判断但任务不同",
  "explanationSupportReasons": ["answer_supported", "distractors_have_boundaries"],
  "misconceptionSupportReasons": ["derived_from_wrong_option"]
}
```

旧客户端必须兼容字段缺失。iOS 正式页面第一版不展示这些字段。

## Task 1: 增加练习蓝图生成

**Files:**
- Modify: `backend/src/generation/prompts/questions.js`
- Modify: `backend/src/generation/generateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: 写 failing test**

在 `backend/src/generation/tests/reviewableSelection.test.js` 增加测试：给一个高价值知识点，期望蓝图包含三类认知动作。

```js
test("builds a three-angle practice blueprint for a high-value point", () => {
  const point = {
    id: "kp-hook",
    title: "hook 与 prompt 的核心区别",
    keyClaim: "hook 是机制，prompt 是请求模型记住",
    importanceScore: 5,
    testabilityScore: 5,
    structureRole: "main_claim",
    questionAngles: ["核心区别", "边界辨析", "场景应用"]
  };

  const blueprint = buildPracticeBlueprint(point);

  expect(blueprint.map((item) => item.memoryAngle)).toEqual([
    "core_recall",
    "boundary_discrimination",
    "scenario_transfer"
  ]);
  expect(blueprint.every((item) => item.goal && item.preferredQuestionType)).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm --prefix backend run check
```

Expected: fails because `buildPracticeBlueprint` is not exported/implemented.

- [ ] **Step 3: 实现最小蓝图构建器**

在 `backend/src/generation/generateQuestions.js` 中新增并导出：

```js
export function buildPracticeBlueprint(point) {
  const importance = Number(point.importanceScore || 3);
  const testability = Number(point.testabilityScore || 3);
  const role = point.structureRole || "";

  if (testability <= 2) {
    return [{
      memoryAngle: "core_recall",
      goal: `取回“${point.title}”的核心判断`,
      preferredQuestionType: "multiple_choice",
      sourceHint: point.sourceQuote || point.keyClaim || "",
      mustAvoid: []
    }];
  }

  const blueprint = [{
    memoryAngle: "core_recall",
    goal: `取回“${point.title}”的核心判断`,
    preferredQuestionType: "multiple_choice",
    sourceHint: point.sourceQuote || point.keyClaim || "",
    mustAvoid: []
  }];

  if (importance >= 4 || ["main_claim", "supporting_reason", "boundary", "method_step"].includes(role)) {
    blueprint.push({
      memoryAngle: "boundary_discrimination",
      goal: `辨析“${point.title}”的适用边界和常见误区`,
      preferredQuestionType: "multiple_choice",
      sourceHint: point.sourceQuote || point.keyClaim || "",
      mustAvoid: []
    });
  }

  if (importance >= 4 && testability >= 4) {
    blueprint.push({
      memoryAngle: "scenario_transfer",
      goal: `把“${point.title}”迁移到新的真实场景中判断`,
      preferredQuestionType: "scenario_judgment",
      sourceHint: point.sourceQuote || point.keyClaim || "",
      mustAvoid: []
    });
  }

  return blueprint.slice(0, 3);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

## Task 2: 出题 prompt 改为按蓝图生成

**Files:**
- Modify: `backend/src/generation/prompts/questions.js`
- Modify: `backend/src/generation/generateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: 增加 prompt 字段测试**

新增测试：生成 question prompt 时必须包含 `practiceBlueprint` 和三类认知动作说明。

```js
test("question prompt includes practice blueprint and cognitive-action contract", () => {
  const prompt = buildQuestionUserPrompt({
    cleanedText: "prompt 是请求模型记住；hook 是让系统执行。",
    knowledgePoints: [{
      id: "kp-hook",
      title: "hook 与 prompt 的核心区别",
      practiceBlueprint: [
        { memoryAngle: "core_recall", goal: "取回核心区别", preferredQuestionType: "multiple_choice" },
        { memoryAngle: "boundary_discrimination", goal: "辨析边界", preferredQuestionType: "multiple_choice" },
        { memoryAngle: "scenario_transfer", goal: "迁移到场景", preferredQuestionType: "scenario_judgment" }
      ]
    }]
  });

  expect(prompt).toContain("practiceBlueprint");
  expect(prompt).toContain("core_recall");
  expect(prompt).toContain("boundary_discrimination");
  expect(prompt).toContain("scenario_transfer");
  expect(prompt).toContain("不要只是机械更换题型");
});
```

- [ ] **Step 2: 修改 prompt**

在 `backend/src/generation/prompts/questions.js` 的出题用户 prompt 中加入：

```text
每道题必须服务一个 practiceBlueprint 项。
memoryAngle 不是装饰字段，必须决定题目问法：
- core_recall：考核心判断，不问局部细节。
- boundary_discrimination：考相似概念、适用边界或常见误区，干扰项必须来自真实混淆对象。
- scenario_transfer：给新场景，让用户迁移原文判断；不能只是改写原文例子。

同一知识点多题优先覆盖不同 memoryAngle。题型多样是手段，不是目标。
如果一个知识点的多道题使用同一题型，必须确保它们完成不同认知动作。
```

- [ ] **Step 3: 将蓝图传入模型输入**

在 `generateQuestions.js` 里，调用 prompt 前为每个 point 补：

```js
const pointsWithBlueprint = knowledgePoints.map((point) => ({
  ...point,
  practiceBlueprint: point.practiceBlueprint?.length ? point.practiceBlueprint : buildPracticeBlueprint(point)
}));
```

- [ ] **Step 4: 跑后端检查**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

## Task 3: 入池选择器按认知动作优先

**Files:**
- Modify: `backend/src/generation/evaluateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: 写同题型但不同认知动作应可保留的测试**

```js
test("keeps same type questions when they cover distinct memory angles", () => {
  const questions = [
    makeQuestion({ id: "q1", type: "scenario_judgment", memoryAngle: "core_recall", score: 5 }),
    makeQuestion({ id: "q2", type: "scenario_judgment", memoryAngle: "boundary_discrimination", score: 5 }),
    makeQuestion({ id: "q3", type: "scenario_judgment", memoryAngle: "scenario_transfer", score: 5 })
  ];

  const selected = selectQualifiedQuestionsByPoint(questions, { targetCount: 3 });

  expect(selected.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  expect(selected.every((q) => q.typeDiversityReason)).toBe(true);
});
```

- [ ] **Step 2: 写不同题型但同质题不能全保留的测试**

```js
test("does not keep three shell-variant questions with the same memory angle", () => {
  const questions = [
    makeQuestion({ id: "q1", type: "multiple_choice", memoryAngle: "core_recall", stem: "hook 与 prompt 的区别是什么？" }),
    makeQuestion({ id: "q2", type: "true_false", memoryAngle: "core_recall", stem: "hook 和 prompt 是否本质相同？" }),
    makeQuestion({ id: "q3", type: "scenario_judgment", memoryAngle: "core_recall", stem: "哪项描述 hook 与 prompt 的区别？" })
  ];

  const selected = selectQualifiedQuestionsByPoint(questions, { targetCount: 3 });

  expect(selected.length).toBeLessThan(3);
});
```

- [ ] **Step 3: 修改排序逻辑**

在每个知识点内部排序时使用以下优先级：

```js
const rankQuestion = (question, selected) => {
  const selectedAngles = new Set(selected.map((item) => item.memoryAngle));
  const selectedTypes = new Set(selected.map((item) => item.questionType));
  return [
    isHighConfidence(question) ? 1000 : 0,
    selectedAngles.has(question.memoryAngle) ? 0 : 300,
    selectedTypes.has(question.questionType) ? 0 : 120,
    Number(question.sourcePrecisionScore || 0) * 20,
    Number(question.sourceMinimalityScore || 0) * 10,
    Number(question.machineAverageScore || 0) * 10
  ].reduce((sum, value) => sum + value, 0);
};
```

- [ ] **Step 4: 同题型保留时记录原因**

如果最终 3 题只有 1 种 `questionType`，写入：

```js
question.typeDiversityReason ||= "same_question_type_kept_because_memory_angles_are_distinct";
```

- [ ] **Step 5: 跑检查**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

## Task 4: 解释、误区、干扰项可信度专项诊断

**Files:**
- Modify: `backend/src/generation/evaluateQuestions.js`
- Modify: `backend/src/generation/judgeQuestionQuality.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: 新增诊断字段**

为 `ReviewQuestion` 兼容输出：

```js
question.explanationSupportReasons = [];
question.misconceptionSupportReasons = [];
question.distractorSupportReasons = [];
```

- [ ] **Step 2: 拆分低置信原因**

将笼统的 `weak_misconception_support` 拆成：

```js
weak_misconception_not_from_source
weak_misconception_not_from_options
weak_misconception_too_generic
```

将 `weak_explanation_faithfulness` 拆成：

```js
weak_explanation_overextends_source
weak_explanation_not_tied_to_correct_answer
weak_explanation_concept_shift
```

- [ ] **Step 3: 修改 judge prompt**

在 `judgeQuestionQuality.js` 的 judge prompt 中加入：

```text
请分别判断：
1. 正确答案解释是否只解释来源能支持的判断。
2. 常见误区是否来自题目选项、原文边界或真实混淆对象。
3. 干扰项是否有学习价值，还是明显凑数。
如果解释只是合理推论但来源没有直接支撑，应标记为 weak_explanation_overextends_source。
```

- [ ] **Step 4: 跑检查**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

## Task 5: 分工/边界类知识点专用模板

**Files:**
- Modify: `backend/src/generation/prompts/questions.js`
- Modify: `backend/src/generation/generateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: 识别边界/分工知识点**

新增 helper：

```js
export function isBoundaryOrRoleSplitPoint(point) {
  const text = `${point.title || ""} ${point.keyClaim || ""} ${point.coverageReason || ""}`;
  return point.structureRole === "boundary"
    || /分工|边界|区别|对比|prompt|hook|CI|CLAUDE\\.md|规则文档/.test(text);
}
```

- [ ] **Step 2: 生成专用蓝图**

对 `isBoundaryOrRoleSplitPoint(point)` 返回 true 的知识点，蓝图优先使用：

```js
[
  { memoryAngle: "core_recall", preferredQuestionType: "multiple_choice", goal: "取回各工具/机制的核心职责" },
  { memoryAngle: "boundary_discrimination", preferredQuestionType: "multiple_choice", goal: "区分容易混淆的职责边界" },
  { memoryAngle: "scenario_transfer", preferredQuestionType: "scenario_judgment", goal: "在真实场景中选择正确机制" }
]
```

- [ ] **Step 3: prompt 增加边界题要求**

```text
如果知识点涉及工具分工、职责边界或机制对比：
- 干扰项必须来自真实混淆对象。
- 解释必须说明为什么其它选项不适合。
- 场景题应要求用户选择机制或诊断错误方案。
```

- [ ] **Step 4: 跑检查**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

## Task 6: 质量报告和工作台展示 PRD 对齐指标

**Files:**
- Modify: `backend/src/generation/tests/qualityReport.js`
- Modify: `backend/src/generation/tests/singleArticleExperiment.js`
- Modify: `demo/quality-review.js`
- Modify: `quality-test-set/manual-scoring-template.md`

- [ ] **Step 1: 报告增加指标**

在 summary 中增加：

```js
memoryAngleCoverageByPoint
singleTypeThreeQuestionPoints
sameAngleDuplicatePoints
averageBlueprintAlignmentScore
explanationIssueFrequency
misconceptionIssueFrequency
distractorIssueFrequency
```

- [ ] **Step 2: CSV 增加人工评分列**

新增列：

```text
memory_angle_fit
blueprint_alignment
is_duplicate_practice
explanation_faithfulness
misconception_realism
distractor_learning_value
```

- [ ] **Step 3: HTML 工作台展示**

在题目详情里显示：

- `memoryAngle`
- `blueprintGoal`
- `memoryAngleFitScore`
- `blueprintAlignmentScore`
- `typeDiversityReason`
- explanation / misconception / distractor 诊断原因

- [ ] **Step 4: 跑检查**

Run:

```bash
npm --prefix backend run check
node --check demo/quality-review.js
```

Expected: PASS.

## Task 7: 单篇基准复测

**Files:**
- Generated: `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/*.json`
- Generated: `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/*.csv`
- Generated: `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/analysis/*.md`
- Modify: `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/README.md`

- [ ] **Step 1: 运行单篇实验**

Run:

```bash
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw \
QUALITY_EXPERIMENT_SLUG=UMr6ia1QubqOMw3aBUGbOw \
QUALITY_EXPERIMENT_LABEL=v7-cognitive-blueprint-alignment \
npm --prefix backend run quality:single
```

- [ ] **Step 2: 检查关键指标**

验收目标：

- 保留知识点不少于 7。
- 入池题不少于 18。
- 每个高价值知识点至少覆盖 2 个不同 `memoryAngle`。
- 单知识点 3 道同题型时必须有 `typeDiversityReason`。
- `weak_explanation_faithfulness` 和 `weak_misconception_support` 不再笼统出现，必须拆成更具体原因。
- 低置信题人工抽查后 accept + fixable 目标不低于 80%。

- [ ] **Step 3: 追加实验记录**

在单篇 README 记录：

```md
### 实验 N：认知动作蓝图对齐

| 项目 | 内容 |
| --- | --- |
| 假设 | 多题质量应由认知动作递进决定，而不是题型或题量。 |
| Prompt 改动 | 出题按 practiceBlueprint 执行。 |
| 规则改动 | 入池选择优先 memoryAngle 覆盖，再考虑题型。 |
| 改善 | ... |
| 新问题 | ... |
| 下一轮 | ... |
```

- [ ] **Step 4: 提交**

Run:

```bash
git add backend/src/generation demo/quality-review.js docs/ios-api-data-contract-zh.md quality-test-set
git commit -m "feat: align question generation with cognitive practice blueprint"
```

## Self-Review Checklist

- [ ] PRD 中不再把“每点 3 题”写成最高目标。
- [ ] 计划区分了 prompt 改动和确定性规则改动。
- [ ] 每个新增字段都是可选字段，旧 iOS 客户端兼容。
- [ ] 验收指标包含用户学习价值，而不只包含题量。
- [ ] 单篇实验继续保存 JSON / CSV / analysis，不把完整原始输出塞进报告。
