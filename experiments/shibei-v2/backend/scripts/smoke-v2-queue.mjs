#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = args["base-url"] || "http://localhost:5273";
const mode = args.mode || "success";
const deviceId = args["device-id"] || "smoke-v2-device";
const sourceUrl = args["source-url"] || "";
const sourceTitle = args["source-title"] || "";
const rawText = args["raw-text"] || [
  "游戏化不是简单地给产品加积分、徽章或排行榜。",
  "更重要的是理解用户动机、行为目标和反馈机制之间的关系。",
  "DMC 模型可以帮助设计者把动机、机制和组件拆开分析。"
].join("\n");

const body = {
  clientRequestId: `smoke-${mode}-${Date.now()}`,
  sourceType: sourceUrl ? "article_link" : "text",
  sourceTitle: sourceTitle || (sourceUrl ? "V2 文章链接 Smoke Test" : "V2 本地队列 Smoke Test"),
  ...(sourceUrl ? { sourceUrl } : { rawText })
};

if (mode === "retry-once") body.debugV2FailureMode = "structured_output_once";
if (mode === "permanent-failure") body.debugV2FailureMode = "missing_api_key";
if (!["success", "retry-once", "permanent-failure"].includes(mode)) {
  throw new Error(`Unknown --mode ${mode}`);
}

const created = await requestJson(`${baseUrl}/api/v2/chapters`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-device-id": deviceId
  },
  body: JSON.stringify(body)
});

const chapterId = created.chapter?.id;
console.log(`chapterId=${chapterId}`);
console.log(`jobId=${created.job?.id || ""}`);
console.log(`reused=${created.reused ? "true" : "false"}`);
if (!chapterId) throw new Error("V2 enqueue response did not include chapter.id");

let lastKey = "";
for (let tick = 0; tick < 240; tick += 1) {
  const result = await requestJson(`${baseUrl}/api/chapters/${encodeURIComponent(chapterId)}`, {
    headers: { "x-device-id": deviceId }
  });
  const chapter = result.chapter || result;
  const progress = chapter.generationProgress || {};
  const key = [
    progress.status,
    progress.stage,
    progress.displayText,
    progress.failureCode || ""
  ].join("|");
  if (key !== lastKey) {
    console.log(`${new Date().toISOString()} status=${progress.status || chapter.status} stage=${progress.stage || ""} text=${progress.displayText || chapter.displayStatusText || ""} failure=${progress.failureCode || ""}`);
    lastKey = key;
  }
  if (progress.status === "completed" || chapter.status === "completed") {
    console.log("completed");
    process.exit(0);
  }
  if (progress.status === "failed" || chapter.status === "failed_generation") {
    console.log("failed");
    process.exit(mode === "permanent-failure" ? 0 : 1);
  }
  await sleep(1000);
}

throw new Error("Timed out waiting for V2 queued generation");

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "1";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
