const PRICE_CHECKED_AT = "2026-05-26";

const MODEL_PRICES = [
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    currency: "USD",
    inputPerMillion: 0.40,
    cachedInputPerMillion: 0.10,
    outputPerMillion: 1.60,
    perCallFee: 0,
    priceSourceUrl: "https://developers.openai.com/api/docs/pricing",
    checkedAt: PRICE_CHECKED_AT
  },
  {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    currency: "CNY",
    inputPerMillion: 1,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 2,
    perCallFee: 0,
    priceSourceUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
    checkedAt: PRICE_CHECKED_AT
  }
];

const DEFAULT_ESTIMATED_OUTPUT_TOKENS = {
  knowledge_points: 2400,
  questions_initial: 2400,
  judge_initial: 900,
  question_rewrite: 800,
  judge_rewrite: 450,
  question_supplement: 900,
  judge_supplement: 500,
  chapter_summary: 180
};

export function createGenerationRunId(prefix = "chapter") {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

export function createModelUsageRecorder({ runId, calls = [] }) {
  const requestHistory = [];
  return {
    calls,
    record(call) {
      const record = buildModelUsageRecord({ runId, previousRequests: requestHistory, ...call });
      calls.push(record);
      requestHistory.push({
        provider: call.provider,
        model: call.model,
        stage: call.stage,
        requestText: call.requestText || ""
      });
      return record;
    }
  };
}

export function buildModelUsageRecord({
  runId,
  stage,
  provider,
  model,
  requestText = "",
  estimatedOutputTokens = null,
  previousRequests = [],
  usage = null,
  error = null
}) {
  const price = findModelPrice(provider, model);
  const estimatedInputTokens = estimateTokenCount(requestText);
  const estimatedCachedInputTokens = estimateCachedInputTokensFromHistory({
    provider,
    model,
    requestText,
    inputTokens: estimatedInputTokens,
    previousRequests
  });
  const estimated = buildCostBlock({
    inputTokens: estimatedInputTokens,
    cachedInputTokens: estimatedCachedInputTokens,
    outputTokens: normalizeEstimatedOutputTokens(stage, estimatedOutputTokens),
    price
  });
  const normalizedUsage = normalizeProviderUsage(provider, usage);
  const actual = normalizedUsage ? buildCostBlock({ ...normalizedUsage, price }) : null;
  const diff = actual ? buildDiff(estimated.cost, actual.cost) : null;

  return {
    runId,
    stage: stage || "unknown",
    provider,
    model,
    price: price ? {
      inputPerMillion: price.inputPerMillion,
      cachedInputPerMillion: price.cachedInputPerMillion,
      outputPerMillion: price.outputPerMillion,
      perCallFee: price.perCallFee,
      currency: price.currency,
      priceSourceUrl: price.priceSourceUrl,
      checkedAt: price.checkedAt
    } : null,
    estimated,
    actual,
    diff,
    recordedAt: new Date().toISOString(),
    ...(error ? { error: String(error) } : {})
  };
}

export function summarizeModelUsage(calls = [], { qualifiedQuestionCount = 0 } = {}) {
  const callList = Array.isArray(calls) ? calls : [];
  const currencies = [...new Set(callList.map((call) => call.estimated?.currency || call.actual?.currency).filter(Boolean))];
  const totalsByCurrency = {};

  for (const currency of currencies) {
    const related = callList.filter((call) => (call.estimated?.currency || call.actual?.currency) === currency);
    const totalEstimatedCost = roundCost(sumCosts(related.map((call) => call.estimated?.cost)));
    const totalActualCost = roundCost(sumCosts(related.map((call) => call.actual?.cost)));
    const costDelta = bothFinite(totalEstimatedCost, totalActualCost)
      ? roundCost(totalEstimatedCost - totalActualCost)
      : null;
    const costErrorRate = bothFinite(totalEstimatedCost, totalActualCost) && totalActualCost !== 0
      ? roundPercent(((totalEstimatedCost - totalActualCost) / totalActualCost) * 100)
      : null;

    totalsByCurrency[currency] = {
      currency,
      callCount: related.length,
      totalEstimatedCost,
      totalActualCost,
      costDelta,
      costErrorRate,
      actualCostPerQualifiedQuestion: qualifiedQuestionCount > 0 && Number.isFinite(totalActualCost)
        ? roundCost(totalActualCost / qualifiedQuestionCount)
        : null
    };
  }

  return {
    callCount: callList.length,
    currencies,
    totalsByCurrency,
    byStage: summarizeStages(callList),
    reportText: renderCostComparisonReport(callList, totalsByCurrency, qualifiedQuestionCount)
  };
}

export function normalizeProviderUsage(provider, usage) {
  if (!usage || typeof usage !== "object") return null;
  if (provider === "openai") {
    const inputTokens = toNumber(usage.input_tokens);
    const cachedInputTokens = toNumber(usage.input_tokens_details?.cached_tokens);
    const outputTokens = toNumber(usage.output_tokens);
    const totalTokens = toNumber(usage.total_tokens);
    if (![inputTokens, cachedInputTokens, outputTokens, totalTokens].some(Number.isFinite)) return null;
    return normalizeUsageValues({ inputTokens, cachedInputTokens, outputTokens, totalTokens });
  }

  if (provider === "deepseek") {
    const inputTokens = toNumber(usage.prompt_tokens);
    const cachedInputTokens = toNumber(
      usage.prompt_cache_hit_tokens
        ?? usage.prompt_tokens_details?.cached_tokens
        ?? usage.input_tokens_details?.cached_tokens
    );
    const outputTokens = toNumber(usage.completion_tokens);
    const totalTokens = toNumber(usage.total_tokens);
    if (![inputTokens, cachedInputTokens, outputTokens, totalTokens].some(Number.isFinite)) return null;
    return normalizeUsageValues({ inputTokens, cachedInputTokens, outputTokens, totalTokens });
  }

  return null;
}

export function estimateTokenCount(value) {
  const text = String(value || "");
  if (!text) return 0;
  let tokens = 0;
  let latinBuffer = "";

  for (const char of text) {
    if (/[A-Za-z0-9_]/.test(char)) {
      latinBuffer += char;
      continue;
    }
    tokens += estimateLatinBuffer(latinBuffer);
    latinBuffer = "";
    if (/\s/.test(char)) continue;
    if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/u.test(char)) tokens += 0.6;
    else tokens += 1;
  }

  tokens += estimateLatinBuffer(latinBuffer);
  return Math.max(1, Math.ceil(tokens));
}

export function estimateCachedInputTokensFromHistory({
  provider,
  model,
  requestText = "",
  inputTokens = null,
  previousRequests = []
}) {
  const text = String(requestText || "");
  const normalizedProvider = String(provider || "").toLowerCase();
  const normalizedModel = String(model || "").toLowerCase();
  const price = findModelPrice(normalizedProvider, normalizedModel);
  if (!text || !price || !Number.isFinite(price.cachedInputPerMillion)) return 0;

  const eligible = Array.isArray(previousRequests)
    ? previousRequests.filter((request) => (
      String(request.provider || "").toLowerCase() === normalizedProvider
        && String(request.model || "").toLowerCase() === normalizedModel
        && request.requestText
    ))
    : [];
  if (!eligible.length) return 0;

  const longestPrefix = eligible.reduce((best, request) => {
    const length = commonPrefixLength(text, String(request.requestText || ""));
    return Math.max(best, length);
  }, 0);
  if (longestPrefix < 256) return 0;

  const prefixTokens = estimateTokenCount(text.slice(0, longestPrefix));
  const normalizedInput = Math.max(0, toNumber(inputTokens) || estimateTokenCount(text));
  return Math.min(normalizedInput, prefixTokens);
}

export function findModelPrice(provider, model) {
  const normalizedProvider = String(provider || "").toLowerCase();
  const normalizedModel = String(model || "").toLowerCase();
  return MODEL_PRICES.find((price) => (
    price.provider === normalizedProvider && price.model.toLowerCase() === normalizedModel
  )) || null;
}

function buildCostBlock({ inputTokens, cachedInputTokens, outputTokens, totalTokens = null, price }) {
  const normalizedInput = Math.max(0, toNumber(inputTokens) || 0);
  const normalizedCached = Math.min(normalizedInput, Math.max(0, toNumber(cachedInputTokens) || 0));
  const normalizedOutput = Math.max(0, toNumber(outputTokens) || 0);
  const uncachedInputTokens = Math.max(0, normalizedInput - normalizedCached);
  const cost = price ? roundCost(
    ((uncachedInputTokens * price.inputPerMillion)
      + (normalizedCached * price.cachedInputPerMillion)
      + (normalizedOutput * price.outputPerMillion)) / 1_000_000
      + price.perCallFee
  ) : null;

  return {
    inputTokens: normalizedInput,
    cachedInputTokens: normalizedCached,
    uncachedInputTokens,
    outputTokens: normalizedOutput,
    totalTokens: Number.isFinite(toNumber(totalTokens))
      ? toNumber(totalTokens)
      : normalizedInput + normalizedOutput,
    cost,
    currency: price?.currency || null
  };
}

function normalizeUsageValues({ inputTokens, cachedInputTokens, outputTokens, totalTokens }) {
  const normalizedInput = Math.max(0, toNumber(inputTokens) || 0);
  const normalizedOutput = Math.max(0, toNumber(outputTokens) || 0);
  const normalizedCached = Math.min(normalizedInput, Math.max(0, toNumber(cachedInputTokens) || 0));
  return {
    inputTokens: normalizedInput,
    cachedInputTokens: normalizedCached,
    outputTokens: normalizedOutput,
    totalTokens: Math.max(0, toNumber(totalTokens) || normalizedInput + normalizedOutput)
  };
}

function buildDiff(estimatedCost, actualCost) {
  if (!Number.isFinite(estimatedCost) || !Number.isFinite(actualCost)) {
    return { costDelta: null, costErrorRate: null };
  }
  const costDelta = roundCost(estimatedCost - actualCost);
  const costErrorRate = actualCost === 0 ? null : roundPercent((costDelta / actualCost) * 100);
  return { costDelta, costErrorRate };
}

function summarizeStages(calls) {
  const stages = {};
  for (const call of calls) {
    const stage = call.stage || "unknown";
    const currency = call.estimated?.currency || call.actual?.currency || "unknown";
    const key = `${stage}:${currency}`;
    if (!stages[key]) {
      stages[key] = {
        stage,
        currency,
        callCount: 0,
        estimatedCost: 0,
        actualCost: 0
      };
    }
    stages[key].callCount += 1;
    stages[key].estimatedCost += Number.isFinite(call.estimated?.cost) ? call.estimated.cost : 0;
    stages[key].actualCost += Number.isFinite(call.actual?.cost) ? call.actual.cost : 0;
  }

  return Object.values(stages).map((stage) => {
    const estimatedCost = roundCost(stage.estimatedCost);
    const actualCost = roundCost(stage.actualCost);
    return {
      ...stage,
      estimatedCost,
      actualCost,
      costDelta: roundCost(estimatedCost - actualCost),
      costErrorRate: actualCost === 0 ? null : roundPercent(((estimatedCost - actualCost) / actualCost) * 100)
    };
  });
}

function renderCostComparisonReport(calls, totalsByCurrency, qualifiedQuestionCount) {
  if (!calls.length) return "";
  const lines = [
    `调用次数：${calls.length}`,
    "",
    "阶段 | 模型 | 估算成本 | 实际成本 | 误差",
    "--- | --- | ---: | ---: | ---:"
  ];
  for (const call of calls) {
    lines.push([
      call.stage,
      call.model,
      formatMoney(call.estimated?.cost, call.estimated?.currency),
      formatMoney(call.actual?.cost, call.actual?.currency),
      formatPercent(call.diff?.costErrorRate)
    ].join(" | "));
  }
  lines.push("");
  for (const total of Object.values(totalsByCurrency)) {
    lines.push(`合计（${total.currency}）：估算 ${formatMoney(total.totalEstimatedCost, total.currency)}，实际 ${formatMoney(total.totalActualCost, total.currency)}，误差 ${formatPercent(total.costErrorRate)}`);
    if (qualifiedQuestionCount > 0) {
      lines.push(`每道入池题实际成本（${total.currency}）：${formatMoney(total.actualCostPerQualifiedQuestion, total.currency)}`);
    }
  }
  return lines.join("\n");
}

function normalizeEstimatedOutputTokens(stage, explicitValue) {
  const explicit = toNumber(explicitValue);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  return DEFAULT_ESTIMATED_OUTPUT_TOKENS[stage] || 800;
}

function estimateLatinBuffer(buffer) {
  if (!buffer) return 0;
  return Math.max(1, Math.ceil(buffer.length / 4));
}

function commonPrefixLength(left, right) {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left[index] === right[index]) index += 1;
  return index;
}

function sumCosts(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) : null;
}

function bothFinite(a, b) {
  return Number.isFinite(a) && Number.isFinite(b);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundCost(value) {
  return Number.isFinite(value) ? Math.round(value * 1_000_000_000) / 1_000_000_000 : null;
}

function roundPercent(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function formatMoney(value, currency) {
  if (!Number.isFinite(value)) return "-";
  const prefix = currency === "USD" ? "$" : currency === "CNY" ? "¥" : "";
  const suffix = prefix ? "" : ` ${currency || ""}`.trimEnd();
  return `${prefix}${value.toFixed(6)}${suffix}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}
