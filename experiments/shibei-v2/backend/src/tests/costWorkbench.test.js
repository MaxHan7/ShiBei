import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildCostRunResponse, costWorkbenchEnabled, saveCostRunResponse, serializeChapterForClient } from "../server.js";

test("cost workbench is disabled in production unless explicitly enabled", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnabled = process.env.ENABLE_COST_WORKBENCH;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_COST_WORKBENCH;
    assert.equal(costWorkbenchEnabled(), false);

    process.env.ENABLE_COST_WORKBENCH = "1";
    assert.equal(costWorkbenchEnabled(), true);

    process.env.ENABLE_COST_WORKBENCH = "0";
    assert.equal(costWorkbenchEnabled(), false);
  } finally {
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("ENABLE_COST_WORKBENCH", originalEnabled);
  }
});

test("builds a cost run response with model usage and cost summary", () => {
  const response = buildCostRunResponse({
    status: "completed",
    chapter: {
      title: "测试章节",
      questions: [{ id: "q-1" }, { id: "q-2" }],
      knowledgePoints: [{ id: "kp-1" }],
      qualitySummary: { averageQualityScore: 4.5 },
      generationMeta: {
        generationRunId: "chapter_123",
        modelUsage: [{ stage: "knowledge_points", estimated: { cost: 0.01, currency: "USD" } }],
        costSummary: {
          callCount: 1,
          currencies: ["USD"],
          totalsByCurrency: { USD: { totalActualCost: 0.012 } },
          reportText: "成本报告"
        }
      }
    }
  });

  assert.equal(response.status, "completed");
  assert.equal(response.chapterTitle, "测试章节");
  assert.equal(response.questionCount, 2);
  assert.equal(response.knowledgePointCount, 1);
  assert.equal(response.generationRunId, "chapter_123");
  assert.equal(response.modelUsage.length, 1);
  assert.equal(response.reportText, "成本报告");
});

test("saves cost run response as latest and per-run JSON", async () => {
  const root = await mkdtemp(join(tmpdir(), "shibei-cost-runs-"));
  try {
    const response = buildCostRunResponse({
      status: "completed",
      chapter: {
        title: "测试章节",
        questions: [{ id: "q-1" }],
        knowledgePoints: [{ id: "kp-1" }],
        generationMeta: {
          generationRunId: "chapter_test_run",
          modelUsage: [{ stage: "knowledge_points" }],
          costSummary: { callCount: 1, currencies: [], totalsByCurrency: {}, reportText: "" }
        }
      }
    });

    const storage = await saveCostRunResponse(response, { root });
    assert.equal(storage.latestPath.endsWith("latest.json"), true);
    assert.equal(storage.runPath.endsWith("chapter_test_run.json"), true);

    const latest = JSON.parse(await readFile(join(root, "latest.json"), "utf8"));
    const run = JSON.parse(await readFile(join(root, "chapter_test_run.json"), "utf8"));
    assert.equal(latest.generationRunId, "chapter_test_run");
    assert.equal(run.chapterTitle, "测试章节");
    assert.deepEqual(latest.costRunStorage, storage);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("app chapter serialization strips cost-only generation metadata", () => {
  const serialized = serializeChapterForClient({
    id: "chapter-test",
    status: "completed",
    generationMeta: {
      generationRunId: "chapter_123",
      currentStage: "completed",
      qualifiedQuestionCount: 1,
      modelUsage: [{ stage: "knowledge_points" }],
      costSummary: { callCount: 1 }
    },
    knowledgePoints: [{ id: "kp-1" }],
    questions: [{ id: "q-1", knowledgePointId: "kp-1" }]
  });

  assert.equal(serialized.generationMeta.currentStage, "completed");
  assert.equal(serialized.generationMeta.qualifiedQuestionCount, 1);
  assert.equal("generationRunId" in serialized.generationMeta, false);
  assert.equal("modelUsage" in serialized.generationMeta, false);
  assert.equal("costSummary" in serialized.generationMeta, false);
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
