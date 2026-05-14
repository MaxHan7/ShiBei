import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReviewChapter } from "./generation/index.js";
import { extractSourceContent } from "./sources/extractSourceContent.js";
import { STATUS_TEXT } from "./generation/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");
const demoRoot = resolve(projectRoot, "demo");
const port = Number(process.env.PORT || 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleGenerate(req, res) {
  const body = await readBody(req);
  try {
    const result = body.regenerateFromChapter
      ? await regenerateFromChapter(body.regenerateFromChapter)
      : await generateFromInput(body);
    sendJson(res, result.status === "completed" ? 200 : 422, result);
  } catch (error) {
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const statusCode = message.includes("OPENAI_API_KEY") || message.includes("DEEPSEEK_API_KEY") ? 500 : 422;
    sendJson(res, statusCode, failedSourceResult({ status, message, body }));
  }
}

async function generateFromInput(body) {
  const source = await extractSourceContent({
    sourceType: body.sourceType,
    rawText: body.rawText,
    sourceTitle: body.sourceTitle,
    sourceUrl: body.sourceUrl,
    sourceAccount: body.sourceAccount
  });
  return generateReviewChapter({
    sourceType: "text",
    rawText: source.rawText,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    sourceAccount: source.sourceAccount,
    originalSourceType: source.sourceType
  });
}

async function regenerateFromChapter(chapter) {
  return generateReviewChapter({
    sourceType: "text",
    rawText: chapter.source?.cleanedText || chapter.source?.rawText || chapter.sourceText || "",
    sourceTitle: chapter.source?.title || chapter.title,
    sourceUrl: chapter.source?.url || "",
    sourceAccount: chapter.source?.account || "",
    originalSourceType: chapter.source?.type || chapter.sourceType || "text",
    knowledgePoints: chapter.knowledgePoints || []
  });
}

function failedSourceResult({ status, message, body }) {
  return {
    status,
    displayStatusText: STATUS_TEXT[status] || "题目生成失败",
    errorCode: status,
    message,
    chapter: {
      title: body?.sourceTitle || body?.sourceUrl || body?.rawText?.slice?.(0, 24) || "未生成章节",
      status,
      displayStatusText: STATUS_TEXT[status] || "题目生成失败",
      failureReason: message,
      source: {
        type: body?.sourceType || "text",
        title: body?.sourceTitle || body?.sourceUrl || "未生成章节",
        url: body?.sourceUrl || "",
        account: body?.sourceAccount || "",
        rawText: body?.rawText || body?.sourceUrl || "",
        cleanedText: body?.rawText || ""
      },
      knowledgePoints: [],
      filteredKnowledgePoints: [],
      questions: [],
      qualitySummary: null,
      generationMeta: {
        currentStage: status,
        failedStage: status,
        failureReason: message,
        stages: [{ status, displayStatusText: STATUS_TEXT[status] || status, at: new Date().toISOString() }]
      }
    }
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(demoRoot, safePath));

  if (!filePath.startsWith(demoRoot)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  if (req.method === "POST" && (req.url === "/api/generate" || req.url === "/api/regenerate")) {
    await handleGenerate(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { errorCode: "method_not_allowed", message: "不支持的请求方法。" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`拾贝 Demo 已启动：http://127.0.0.1:${port}`);
});
