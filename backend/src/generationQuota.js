const DEFAULT_DAILY_REAL_GENERATION_LIMIT = readPositiveInt(
  process.env.RECALLO_DAILY_REAL_GENERATION_LIMIT,
  5
);

export class GenerationQuotaError extends Error {
  constructor({
    errorCode = "quota_exceeded_daily_generation",
    message = "今天的免费生成次数已经用完，请明天再试。",
    statusCode = 429,
    quota = null
  } = {}) {
    super(message);
    this.name = "GenerationQuotaError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.quota = quota;
  }
}

export function dailyRealGenerationLimit() {
  return DEFAULT_DAILY_REAL_GENERATION_LIMIT;
}

export function generationQuotaDayUTC(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid generation quota date");
  }
  return date.toISOString().slice(0, 10);
}

export async function enforceDailyGenerationQuota({
  deviceId,
  requestId,
  claimQuota,
  limit = dailyRealGenerationLimit(),
  now = new Date()
} = {}) {
  if (!deviceId) {
    throw new GenerationQuotaError({
      errorCode: "generation_quota_unavailable",
      message: "生成额度暂时不可用，请稍后再试。",
      statusCode: 503
    });
  }
  if (!requestId) {
    throw new GenerationQuotaError({
      errorCode: "generation_quota_unavailable",
      message: "生成请求缺少稳定编号，请重新提交。",
      statusCode: 503
    });
  }
  if (typeof claimQuota !== "function") {
    throw new GenerationQuotaError({
      errorCode: "generation_quota_unavailable",
      message: "生成额度暂时不可用，请稍后再试。",
      statusCode: 503
    });
  }

  let result;
  try {
    result = await claimQuota(deviceId, {
      requestId,
      quotaDay: generationQuotaDayUTC(now),
      limit
    });
  } catch (error) {
    throw new GenerationQuotaError({
      errorCode: "generation_quota_unavailable",
      message: "生成额度暂时不可用，请稍后再试。",
      statusCode: 503,
      quota: {
        cause: error instanceof Error ? error.message : String(error)
      }
    });
  }

  if (!result?.allowed) {
    throw new GenerationQuotaError({
      quota: normalizeQuotaResult(result, { limit })
    });
  }

  return normalizeQuotaResult(result, { limit });
}

export function createMemoryGenerationQuotaStore() {
  const claimsByDeviceAndDay = new Map();
  const requestsByDevice = new Map();

  return {
    async claimDailyGenerationQuota(deviceId, { requestId, quotaDay, limit } = {}) {
      const deviceKey = String(deviceId || "");
      const day = String(quotaDay || "");
      const requestKey = String(requestId || "");
      const requestSet = requestsByDevice.get(deviceKey) || new Set();
      requestsByDevice.set(deviceKey, requestSet);
      const dayKey = `${deviceKey}:${day}`;
      const claimSet = claimsByDeviceAndDay.get(dayKey) || new Set();
      claimsByDeviceAndDay.set(dayKey, claimSet);

      if (requestSet.has(requestKey)) {
        return {
          allowed: true,
          reused: true,
          used: claimSet.size,
          limit,
          quotaDay: day
        };
      }

      if (claimSet.size >= limit) {
        return {
          allowed: false,
          reused: false,
          used: claimSet.size,
          limit,
          quotaDay: day
        };
      }

      requestSet.add(requestKey);
      claimSet.add(requestKey);
      return {
        allowed: true,
        reused: false,
        used: claimSet.size,
        limit,
        quotaDay: day
      };
    }
  };
}

function normalizeQuotaResult(result = {}, { limit }) {
  return {
    allowed: Boolean(result.allowed),
    reused: Boolean(result.reused),
    used: Number.isFinite(result.used) ? result.used : 0,
    limit: Number.isFinite(result.limit) ? result.limit : limit,
    quotaDay: result.quotaDay || ""
  };
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
