import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createGenerationNotification } from "../chapterGeneration.js";

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`Timed out waiting for ${label}`);
}

test("generation notifications wait for the push delivery attempt", async () => {
  const deleted = [];
  const pushCalls = [];
  let resolvePush;
  let returned = false;

  const resultPromise = createGenerationNotification({
    deviceId: "device-1",
    chapter: {
      id: "chapter-1",
      title: "测试章节",
      status: "ready"
    },
    deleteNotificationsForChapter: async (deviceId, chapterId, type) => {
      deleted.push({ deviceId, chapterId, type });
    },
    upsertNotification: async (deviceId, notification) => ({
      ...notification,
      id: "notification-1",
      deviceId
    }),
    sendPushNotifications: async (deviceId, notification, chapter) => {
      pushCalls.push({ deviceId, notification, chapter });
      await new Promise((resolve) => {
        resolvePush = resolve;
      });
      return { sentCount: 1 };
    }
  }).then((result) => {
    returned = true;
    return result;
  });

  await waitFor(() => pushCalls.length === 1, "push delivery attempt");
  assert.equal(pushCalls.length, 1);
  assert.equal(returned, false);
  assert.equal(pushCalls[0].notification.id, "notification-1");
  assert.equal(pushCalls[0].chapter.id, "chapter-1");

  resolvePush();
  const result = await resultPromise;
  assert.equal(returned, true);
  assert.equal(result.id, "notification-1");
  assert.deepEqual(deleted.map((item) => item.type), ["generation_failed", "generation_completed"]);
});

test("push token registration does not replay stale unread notifications", async () => {
  const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.equal(serverSource.includes("sendPendingStoredPushNotifications"), false);
  assert.equal(serverSource.includes("PENDING_PUSH_REPLAY_WINDOW_MS"), false);

  const routeStart = serverSource.indexOf('req.method === "POST" && req.url === "/api/devices/push-token"');
  assert.notEqual(routeStart, -1);
  const routeEnd = serverSource.indexOf('req.method === "GET" && req.url === "/api/devices/push-status"', routeStart);
  assert.notEqual(routeEnd, -1);
  const routeSource = serverSource.slice(routeStart, routeEnd);
  assert.equal(routeSource.includes("pendingPush"), false);
});
