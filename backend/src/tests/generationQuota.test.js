import assert from "node:assert/strict";
import test from "node:test";

import {
  createMemoryGenerationQuotaStore,
  enforceDailyGenerationQuota,
  GenerationQuotaError,
  generationQuotaDayUTC
} from "../generationQuota.js";

test("generation quota day uses UTC calendar date", () => {
  assert.equal(generationQuotaDayUTC("2026-07-02T23:59:59.000Z"), "2026-07-02");
  assert.equal(generationQuotaDayUTC("2026-07-03T00:00:00.000Z"), "2026-07-03");
});

test("allows five daily real generation claims and rejects the sixth", async () => {
  const store = createMemoryGenerationQuotaStore();

  for (const requestId of ["request-1", "request-2", "request-3", "request-4", "request-5"]) {
    const quota = await enforceDailyGenerationQuota({
      deviceId: "device-1",
      requestId,
      claimQuota: store.claimDailyGenerationQuota,
      now: "2026-07-02T10:00:00.000Z",
      limit: 5
    });
    assert.equal(quota.allowed, true);
  }

  await assert.rejects(
    enforceDailyGenerationQuota({
      deviceId: "device-1",
      requestId: "request-6",
      claimQuota: store.claimDailyGenerationQuota,
      now: "2026-07-02T11:00:00.000Z",
      limit: 5
    }),
    (error) => {
      assert.equal(error instanceof GenerationQuotaError, true);
      assert.equal(error.errorCode, "quota_exceeded_daily_generation");
      assert.equal(error.statusCode, 429);
      assert.equal(error.quota.used, 5);
      return true;
    }
  );
});

test("does not count the same request id twice", async () => {
  const store = createMemoryGenerationQuotaStore();

  const first = await enforceDailyGenerationQuota({
    deviceId: "device-1",
    requestId: "request-1",
    claimQuota: store.claimDailyGenerationQuota,
    now: "2026-07-02T10:00:00.000Z",
    limit: 1
  });
  const second = await enforceDailyGenerationQuota({
    deviceId: "device-1",
    requestId: "request-1",
    claimQuota: store.claimDailyGenerationQuota,
    now: "2026-07-02T10:01:00.000Z",
    limit: 1
  });

  assert.equal(first.used, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.reused, true);
  assert.equal(second.used, 1);
});

test("starts a fresh quota on the next UTC day", async () => {
  const store = createMemoryGenerationQuotaStore();

  await enforceDailyGenerationQuota({
    deviceId: "device-1",
    requestId: "request-1",
    claimQuota: store.claimDailyGenerationQuota,
    now: "2026-07-02T23:59:00.000Z",
    limit: 1
  });

  const nextDay = await enforceDailyGenerationQuota({
    deviceId: "device-1",
    requestId: "request-2",
    claimQuota: store.claimDailyGenerationQuota,
    now: "2026-07-03T00:00:00.000Z",
    limit: 1
  });

  assert.equal(nextDay.allowed, true);
  assert.equal(nextDay.quotaDay, "2026-07-03");
  assert.equal(nextDay.used, 1);
});
