export function createMediaUsageRecorder({ runId, calls = [] } = {}) {
  return {
    calls,
    record(call) {
      const record = {
        runId: String(runId || ""),
        stage: String(call.stage || "unknown"),
        provider: String(call.provider || ""),
        cost: roundCost(call.cost),
        currency: String(call.currency || "USD"),
        metadata: call.metadata || {},
        recordedAt: new Date().toISOString()
      };
      calls.push(record);
      return record;
    }
  };
}

export function summarizeMediaUsage(calls = []) {
  const byStage = {};
  const totalsByCurrency = {};
  for (const call of calls) {
    byStage[call.stage] ||= { callCount: 0, totalCost: 0, provider: "", metadata: {} };
    byStage[call.stage].callCount += 1;
    byStage[call.stage].totalCost = roundCost(byStage[call.stage].totalCost + Number(call.cost || 0));
    byStage[call.stage].provider = call.provider || byStage[call.stage].provider;
    byStage[call.stage].metadata = call.metadata || byStage[call.stage].metadata || {};
    totalsByCurrency[call.currency] ||= { currency: call.currency, callCount: 0, totalCost: 0 };
    totalsByCurrency[call.currency].callCount += 1;
    totalsByCurrency[call.currency].totalCost = roundCost(totalsByCurrency[call.currency].totalCost + Number(call.cost || 0));
  }
  return { callCount: calls.length, byStage, totalsByCurrency };
}

function roundCost(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1_000_000) / 1_000_000 : 0;
}
