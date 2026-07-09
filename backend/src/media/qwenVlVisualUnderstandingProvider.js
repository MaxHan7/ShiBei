import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { parseModelJson } from "../generation/openaiClient.js";
import { createMediaExtractionError } from "./mediaErrors.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = VIDEO_DEFAULTS.visualModel;
const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_VISUAL_TIMEOUT_MS, 90_000);
const DEFAULT_MAX_GRIDS = readPositiveInt(process.env.VIDEO_VISUAL_MAX_GRIDS, 4);
const DEFAULT_MAX_FRAMES = readPositiveInt(process.env.VIDEO_VISUAL_MAX_FRAMES, 12);

export function createQwenVlVisualUnderstandingProvider({
  env = process.env,
  fetchImpl = fetch,
  readFileImpl = readFile
} = {}) {
  const apiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY;
  const model = String(env.VIDEO_VISUAL_MODEL || env.QWEN_VL_MODEL || DEFAULT_MODEL).trim();
  const baseUrl = normalizeBaseUrl(env.QWEN_API_BASE_URL || env.DASHSCOPE_API_BASE_URL || DEFAULT_BASE_URL);
  const timeoutMs = readPositiveInt(env.VIDEO_VISUAL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const maxGrids = readPositiveInt(env.VIDEO_VISUAL_MAX_GRIDS, DEFAULT_MAX_GRIDS);
  const maxFrames = readPositiveInt(env.VIDEO_VISUAL_MAX_FRAMES, DEFAULT_MAX_FRAMES);

  return {
    name: "qwen-vl",
    model,
    async understandVideo({ video = {}, transcriptSegments = [], framePack = null } = {}) {
      if (!apiKey) {
        throw createMediaExtractionError(
          "visual_provider_missing_api_key",
          "缺少 Qwen 视觉模型 API Key。请设置 QWEN_API_KEY 或 DASHSCOPE_API_KEY。",
          { retryable: false, provider: "qwen-vl" }
        );
      }

      const evidenceItems = selectVisualEvidence(framePack, { maxGrids, maxFrames });
      if (!evidenceItems.length) {
        return {
          provider: "qwen-vl",
          model,
          skipped: true,
          reason: "video_frame_pack_empty",
          segments: []
        };
      }

      const content = [];
      for (const item of evidenceItems) {
        content.push({
          type: "image_url",
          image_url: {
            url: await toDataUrl(item.path, readFileImpl)
          }
        });
      }
      content.push({
        type: "text",
        text: buildPrompt({ video, transcriptSegments, evidenceItems })
      });

      const payload = await callQwenVl({
        fetchImpl,
        url: `${baseUrl}/chat/completions`,
        apiKey,
        model,
        content,
        timeoutMs
      });
      const text = payload?.choices?.[0]?.message?.content;
      if (!text) {
        throw createMediaExtractionError(
          "visual_provider_empty_response",
          "Qwen 视觉模型没有返回可用内容。",
          { retryable: true, provider: "qwen-vl" }
        );
      }

      const parsed = parseModelJson(text);
      const segments = normalizeQwenVisualSegments(parsed, evidenceItems);
      return {
        provider: "qwen-vl",
        model,
        skipped: false,
        reason: "",
        segments,
        usage: normalizeQwenUsage(payload?.usage)
      };
    }
  };
}

function selectVisualEvidence(framePack, { maxGrids, maxFrames }) {
  const grids = Array.isArray(framePack?.grids) ? framePack.grids : [];
  if (grids.length) {
    return grids
      .filter((grid) => grid?.path)
      .slice(0, maxGrids)
      .map((grid, index) => ({
        id: grid.id || `grid-${String(index + 1).padStart(4, "0")}`,
        kind: "grid",
        path: grid.path,
        startSeconds: finiteNumber(grid.startSeconds),
        endSeconds: finiteNumber(grid.endSeconds)
      }));
  }

  const frames = Array.isArray(framePack?.frames) ? framePack.frames : [];
  return frames
    .filter((frame) => frame?.path)
    .slice(0, maxFrames)
    .map((frame, index) => ({
      id: frame.id || `frame-${String(index + 1).padStart(4, "0")}`,
      kind: "frame",
      path: frame.path,
      startSeconds: finiteNumber(frame.startSeconds),
      endSeconds: finiteNumber(frame.endSeconds)
    }));
}

function buildPrompt({ video, transcriptSegments, evidenceItems }) {
  const evidenceLines = evidenceItems.map((item, index) => (
    `${index + 1}. ${item.id} (${item.kind}) ${formatTimeRange(item)}`
  ));
  const transcriptLines = summarizeTranscript(transcriptSegments);
  return [
    "你会看到一个短视频抽出的关键帧或九宫格截图。请把画面中对学习和出题有价值的信息转成结构化文本。",
    "",
    "要求：",
    "- 只描述画面中能看见的信息，尤其是 UI、文字、流程图、步骤、对象关系、屏幕操作状态。",
    "- 可以参考 ASR 口播上下文理解画面，但不要把没有视觉依据的口播内容重复写成画面信息。",
    "- 不要编造看不见的细节。",
    "- 输出必须是 JSON 对象，不要 Markdown，不要解释。",
    "- 每个 segment 的 text 应该是中文，适合作为 LearningSource 的 visual_summary。",
    "",
    "JSON 格式：",
    "{\"segments\":[{\"evidenceId\":\"grid-0001\",\"startSeconds\":0,\"endSeconds\":5,\"text\":\"画面展示...\",\"confidence\":0.8}]}",
    "",
    `视频标题：${video?.title || ""}`,
    `视频平台：${video?.platform || ""}`,
    "",
    "视觉证据：",
    ...evidenceLines,
    "",
    "ASR 口播上下文：",
    ...transcriptLines
  ].join("\n");
}

function summarizeTranscript(segments = []) {
  const lines = Array.isArray(segments)
    ? segments
      .slice(0, 24)
      .map((segment) => `${formatTimeRange(segment)} ${segment.text || ""}`.trim())
      .filter(Boolean)
    : [];
  return lines.length ? lines : ["（无可用 ASR 片段）"];
}

async function callQwenVl({
  fetchImpl,
  url,
  apiKey,
  model,
  content,
  timeoutMs
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "你是视频画面理解助手，只输出严格 JSON。"
          },
          {
            role: "user",
            content
          }
        ],
        response_format: { type: "json_object" },
        enable_thinking: false,
        stream: false,
        temperature: 0.1,
        max_tokens: 1800
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw createMediaExtractionError(
        response.status === 429 ? "visual_provider_rate_limited" : "visual_provider_unavailable",
        payload?.error?.message || `Qwen 视觉模型请求失败：${response.status}`,
        { retryable: response.status >= 500 || response.status === 429, provider: "qwen-vl", status: response.status }
      );
    }
    return payload;
  } catch (error) {
    if (error?.code === "failed_extract_video") throw error;
    if (error?.name === "AbortError") {
      throw createMediaExtractionError(
        "visual_provider_timeout",
        "Qwen 视觉模型请求超时，请稍后重试。",
        { retryable: true, provider: "qwen-vl" }
      );
    }
    throw createMediaExtractionError(
      "visual_provider_unavailable",
      "Qwen 视觉模型暂时不可用，请稍后重试。",
      { retryable: true, provider: "qwen-vl", cause: error }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeQwenVisualSegments(parsed, evidenceItems) {
  const rawSegments = Array.isArray(parsed?.segments)
    ? parsed.segments
    : Array.isArray(parsed?.visualSegments)
      ? parsed.visualSegments
      : [];
  return rawSegments
    .map((segment, index) => {
      const evidence = findEvidence(evidenceItems, segment.evidenceId);
      const startSeconds = finiteNumber(segment.startSeconds);
      const endSeconds = finiteNumber(segment.endSeconds);
      return {
        id: segment.id || `visual-${String(index + 1).padStart(3, "0")}`,
        sourceRole: "visual_summary",
        startSeconds: Number.isFinite(startSeconds) ? startSeconds : evidence?.startSeconds ?? null,
        endSeconds: Number.isFinite(endSeconds) ? endSeconds : evidence?.endSeconds ?? null,
        text: cleanText(segment.text || segment.summary || ""),
        ...(Number.isFinite(Number(segment.confidence)) ? { confidence: Number(segment.confidence) } : {})
      };
    })
    .filter((segment) => segment.text);
}

function normalizeQwenUsage(usage) {
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return {};
  const inputTokens = finiteNumber(usage.input_tokens);
  const outputTokens = finiteNumber(usage.output_tokens);
  const promptTokens = finiteNumber(usage.prompt_tokens) ?? inputTokens;
  const completionTokens = finiteNumber(usage.completion_tokens) ?? outputTokens;
  const totalTokens = finiteNumber(usage.total_tokens)
    ?? (Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
      ? promptTokens + completionTokens
      : null);
  return {
    ...(Number.isFinite(promptTokens) ? { prompt_tokens: promptTokens } : {}),
    ...(Number.isFinite(completionTokens) ? { completion_tokens: completionTokens } : {}),
    ...(Number.isFinite(totalTokens) ? { total_tokens: totalTokens } : {}),
    ...(Number.isFinite(inputTokens) ? { input_tokens: inputTokens } : {}),
    ...(Number.isFinite(outputTokens) ? { output_tokens: outputTokens } : {})
  };
}

function findEvidence(items, evidenceId) {
  if (!evidenceId) return null;
  return items.find((item) => item.id === evidenceId) || null;
}

async function toDataUrl(path, readFileImpl) {
  const buffer = await readFileImpl(path);
  return `data:${mimeTypeForPath(path)};base64,${Buffer.from(buffer).toString("base64")}`;
}

function mimeTypeForPath(path) {
  const ext = extname(String(path || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function formatTimeRange(value) {
  const start = finiteNumber(value?.startSeconds);
  const end = finiteNumber(value?.endSeconds);
  if (Number.isFinite(start) && Number.isFinite(end)) return `${start}s-${end}s`;
  if (Number.isFinite(start)) return `${start}s`;
  return "";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
